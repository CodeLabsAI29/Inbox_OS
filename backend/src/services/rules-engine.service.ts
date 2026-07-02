import { PrismaClient, Rule, RuleCondition, RuleAction } from '@prisma/client';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import { EmailSenderService } from './email-sender.service';
import { logger } from '../utils/logger';
import { TelegramNotificationService } from './telegram-notification.service';

const prisma = new PrismaClient();

export class RulesEngineService {
  /**
   * Evaluates active rules for a user against an ingested email.
   * Executes actions on matching rules and logs outcomes to the database.
   */
  public static async evaluateRules(email: any, userId: string): Promise<void> {
    try {
      logger.info(
        `[RulesEngine] Evaluating rules for user: ${userId} on email: ${email.id}`
      );

      // 1. Fetch active rules ordered by priority DESC
      const rules = await prisma.rule.findMany({
        where: { userId, isActive: true },
        orderBy: { priority: 'desc' },
        include: {
          conditions: true,
          actions: true,
        },
      });

      if (rules.length === 0) {
        logger.info(`[RulesEngine] No active rules found for user: ${userId}`);
        return;
      }

      for (const rule of rules) {
        let match = true;

        // 2. Evaluate all conditions (AND logic)
        for (const condition of rule.conditions) {
          if (!this.evaluateCondition(condition, email)) {
            match = false;
            break;
          }
        }

        if (match) {
          logger.info(
            `[RulesEngine] Email ${email.id} matched rule: "${rule.name}" (${rule.id})`
          );

          let status: 'success' | 'failed' = 'success';
          let errorMessage: string | undefined = undefined;

          try {
            // 3. Execute actions sequentially
            for (const action of rule.actions) {
              await this.executeAction(action, email, userId);
            }
          } catch (actionErr: any) {
            status = 'failed';
            errorMessage = actionErr.message || String(actionErr);
            logger.error(
              `[RulesEngine] Action execution failed for rule ${rule.id}:`,
              actionErr
            );
          }

          // 4. Log rule execution to the database
          await prisma.ruleExecutionLog.create({
            data: {
              ruleId: rule.id,
              emailId: email.id,
              status,
              errorMessage,
            },
          });

          // Trigger WebSocket/EventBus notifications if necessary
          try {
            const { WebSocketService } = await import('./websocket.service');
            WebSocketService.emitToUser(userId, 'rule.executed', {
              ruleId: rule.id,
              ruleName: rule.name,
              emailId: email.id,
              status,
              errorMessage,
            });
          } catch (wsErr) {
            // Ignore WS errors silently
          }

          // Alert user via Telegram about rule/workflow execution
          try {
            const userSettings = await prisma.userSettings.findFirst({
              where: { userId, telegramEnabled: true },
            });
            if (userSettings && userSettings.telegramChatId) {
              await TelegramNotificationService.sendWorkflowFinishedAlert(
                userSettings.telegramChatId,
                rule.name
              );
            }
          } catch (teleErr) {
            logger.error(
              `[RulesEngine] Failed to send Telegram rule notification:`,
              teleErr
            );
          }

          // Stop at first matching rule to prevent rule collisions (standard priority rule execution)
          break;
        }
      }
    } catch (err: any) {
      logger.error(
        `[RulesEngine] Failed to evaluate rules:`,
        err.message || err
      );
    }
  }

  private static evaluateCondition(
    condition: RuleCondition,
    email: any
  ): boolean {
    const field = condition.field.toLowerCase();
    const operator = condition.operator.toLowerCase();
    const targetValue = condition.value;

    let actualValue: any = null;

    // Resolve target email properties
    if (field === 'from') {
      actualValue = email.sender;
    } else if (field === 'to') {
      actualValue = email.recipient;
    } else if (field === 'subject') {
      actualValue = email.subject;
    } else if (field === 'body') {
      actualValue = email.body;
    } else if (field === 'category') {
      actualValue = email.category;
    } else if (field === 'senderdomain') {
      if (email.sender && email.sender.includes('@')) {
        actualValue = email.sender.split('@').pop() || '';
      }
    } else if (field === 'hasattachments') {
      actualValue = 'false'; // Default fallback (Email schema does not persist attachments currently)
    } else {
      logger.warn(`[RulesEngine] Unknown condition field: ${field}`);
      return false;
    }

    if (actualValue === null || actualValue === undefined) {
      return false;
    }

    const actualStr = String(actualValue).toLowerCase();
    const targetStr = String(targetValue).toLowerCase();

    // Evaluate operators
    try {
      switch (operator) {
        case 'equals':
          return actualStr === targetStr;
        case 'contains':
          return actualStr.includes(targetStr);
        case 'startswith':
          return actualStr.startsWith(targetStr);
        case 'endswith':
          return actualStr.endsWith(targetStr);
        case 'regex':
          const regex = new RegExp(targetValue, 'i');
          return regex.test(String(actualValue));
        case 'gt':
          return parseFloat(actualValue) > parseFloat(targetValue);
        case 'lt':
          return parseFloat(actualValue) < parseFloat(targetValue);
        case 'in':
          const values = targetStr.split(',').map((v) => v.trim());
          return values.includes(actualStr);
        default:
          logger.warn(
            `[RulesEngine] Unsupported condition operator: ${operator}`
          );
          return false;
      }
    } catch (err) {
      logger.error(
        `[RulesEngine] Operator evaluation error (${operator}):`,
        err
      );
      return false;
    }
  }

  private static async executeAction(
    action: RuleAction,
    email: any,
    userId: string
  ): Promise<void> {
    const config = action.config as any;
    const actionType = action.type.toLowerCase();

    logger.info(
      `[RulesEngine] Executing action: ${action.type} for email: ${email.id}`
    );

    switch (actionType) {
      case 'markasread':
        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'READ' },
        });
        break;

      case 'markasurgent':
        await prisma.email.update({
          where: { id: email.id },
          data: { category: 'urgent' },
        });
        break;

      case 'forwardto':
        if (!config || !config.forwardToEmail) {
          throw new Error(
            'Action forwardTo requires forwardToEmail in configuration'
          );
        }
        await EmailSenderService.send(userId, {
          to: config.forwardToEmail,
          subject: `FWD: ${email.subject}`,
          text: `---------- Forwarded message ----------\nFrom: ${email.sender}\nTo: ${email.recipient}\nSubject: ${email.subject}\nDate: ${email.createdAt}\n\n${email.body}`,
        });
        break;

      case 'webhook':
        if (!config || !config.targetUrl) {
          throw new Error('Action webhook requires targetUrl in configuration');
        }
        const secret = config.secret || 'rules-secret-key-123';
        WebhookDispatcher.dispatch(
          config.targetUrl,
          secret,
          'email.rule_match',
          {
            emailId: email.id,
            sender: email.sender,
            recipient: email.recipient,
            subject: email.subject,
            category: email.category,
          }
        );
        break;

      case 'movetofolder':
        // Schema fallback: Update status prefix to mimic folders since folder model is missing
        if (config && config.folderName) {
          await prisma.email.update({
            where: { id: email.id },
            data: { status: `FOLDER_${config.folderName.toUpperCase()}` },
          });
        }
        break;

      case 'applylabel':
        // Schema fallback: Prepend category badge to subject since label schema is missing
        if (config && config.labelName) {
          await prisma.email.update({
            where: { id: email.id },
            data: { subject: `[${config.labelName}] ${email.subject}` },
          });
        }
        break;

      case 'sendtelegram':
        const userSettings = await prisma.userSettings.findFirst({
          where: { userId, telegramEnabled: true },
        });
        if (userSettings && userSettings.telegramChatId) {
          await TelegramNotificationService.sendImportantEmailAlert(
            userSettings.telegramChatId,
            {
              sender: email.sender,
              subject: email.subject,
              summary: email.body, // Pass email body content
            }
          );
        } else {
          logger.warn(
            `[RulesEngine] Telegram alert not sent: User settings missing or telegram disabled/unlinked for user ${userId}`
          );
        }
        break;

      case 'sendwhatsapp':
        // Log "not yet implemented" since adapters are missing in Node stack, but track execution successfully
        logger.warn(
          `[RulesEngine] Output adapter action ${actionType} is queued but unrouted on Node stack`
        );
        break;

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }
}
