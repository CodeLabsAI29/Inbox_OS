#!/usr/bin/env python3
"""
generate_eval_dataset.py
Generates a cohesive email conversation dataset for Project X, including evaluation queries
and ground truth answers for RAG testing.

Outputs: project_x_eval_dataset.csv
"""

import csv
import os
import uuid
import sys

# Definitive set of emails forming the cohesive Project X conversation.
# The queries are mapped to rows, testing RAG retrieval over overlapping contexts.
EMAILS = [
    {
        "sender": "Sarah Jenkins (Project Manager) <sarah.jenkins@inboxos.dev>",
        "recipient": "John Doe <john.doe@inboxos.dev>, Emily Smith <emily.smith@inboxos.dev>",
        "subject": "Project X: Kickoff and Proposed Timeline",
        "timestamp": "2026-06-15T09:00:00Z",
        "body": (
            "Hi team,\n\n"
            "Welcome to Project X! We are integrating the new billing system and Microsoft Graph API token synchronization.\n\n"
            "Here is the proposed timeline:\n"
            "- Kickoff: June 15\n"
            "- Staging Environment ready: July 8\n"
            "- QA testing: July 9 - July 14\n"
            "- Launch: July 15\n\n"
            "Our budget for this project is capped at $15,000.\n\n"
            "John, you will lead the API integration. Emily, you will handle the QA automation.\n\n"
            "Let me know if you see any conflicts.\n\n"
            "Best,\n"
            "Sarah"
        ),
        "query": "What is the final approved budget for Project X, and who approved it?",
        "ground_truth": "The final approved budget is $16,500. It was approved by Marcus Vance from Finance, who agreed to a maximum 10% ($1,500) increase over the initial $15,000 proposal to accommodate timeline changes."
    },
    {
        "sender": "John Doe <john.doe@inboxos.dev>",
        "recipient": "Sarah Jenkins <sarah.jenkins@inboxos.dev>, Emily Smith <emily.smith@inboxos.dev>",
        "subject": "Re: Project X: Kickoff and Proposed Timeline",
        "timestamp": "2026-06-15T11:30:00Z",
        "body": (
            "Hi Sarah,\n\n"
            "The timeline looks tight. I have concerns about the Microsoft Graph API token synchronization. "
            "The OAuth2 token refresh flow has known latency issues, and we might face token sync lag during peak times.\n\n"
            "I propose we delay the launch to July 20 to allow for thorough testing of the token refresh logic.\n\n"
            "Also, will we need to integrate Gmail API in this phase as well?\n\n"
            "Thanks,\n"
            "John"
        ),
        "query": "What technical issue did John raise regarding the Microsoft Graph API, and what solution did he propose if credentials are delayed?",
        "ground_truth": "John Doe raised concerns about OAuth2 token synchronization refresh flow latency and sync lag. If credentials are delayed, John proposed setting up a local Mock Server by July 8 to simulate token refresh responses so that QA testing is not blocked."
    },
    {
        "sender": "Marcus Vance (Finance) <marcus.vance@inboxos.dev>",
        "recipient": "Sarah Jenkins <sarah.jenkins@inboxos.dev>, John Doe <john.doe@inboxos.dev>",
        "subject": "Re: Project X: Budget & Timeline",
        "timestamp": "2026-06-16T10:00:00Z",
        "body": (
            "Hi Sarah and John,\n\n"
            "I saw the thread about delaying the launch to July 20.\n\n"
            "From a budget perspective, delaying the launch will increase our staging server lease and contractor costs. "
            "We can approve a maximum budget increase of 10% ($1,500), bringing the total budget to $16,500. We cannot exceed this.\n\n"
            "Also, to John's question: Gmail API integration is NOT in scope for Phase 1. We must focus exclusively on Microsoft Graph API.\n\n"
            "Regards,\n"
            "Marcus"
        ),
        "query": "What are the start and end dates of Emily Smith's upcoming Out of Office (OOO) period, and who is her backup?",
        "ground_truth": "Emily Smith will be Out of Office (OOO) from July 5 to July 8, 2026. Her colleague Dave will cover critical bug checks during her absence."
    },
    {
        "sender": "Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "recipient": "John Doe <john.doe@inboxos.dev>, Marcus Vance <marcus.vance@inboxos.dev>, Emily Smith <emily.smith@inboxos.dev>",
        "subject": "Re: Project X: Budget & Timeline Approved",
        "timestamp": "2026-06-16T14:00:00Z",
        "body": (
            "Hi all,\n\n"
            "Thanks for the quick feedback.\n\n"
            "1. Timeline: We will move the launch date to July 20 as John suggested.\n"
            "2. Budget: Marcus, thank you for approving the budget increase to $16,500. We will keep costs within this limit.\n"
            "3. Scope: John, as Marcus confirmed, Gmail API is out of scope for Phase 1 and will be postponed to Phase 2.\n\n"
            "Emily, does the new launch date of July 20 work for the QA schedule?\n\n"
            "Best,\n"
            "Sarah"
        ),
        "query": "By what date did Emily request the staging environment to be ready, and when did John promise it would actually be ready?",
        "ground_truth": "Emily Smith requested that the staging environment be ready by July 12, 2026. John Doe promised to have it ready by July 10, 2026, which is two days earlier than requested."
    },
    {
        "sender": "Emily Smith <emily.smith@inboxos.dev>",
        "recipient": "Sarah Jenkins <sarah.jenkins@inboxos.dev>, John Doe <john.doe@inboxos.dev>",
        "subject": "Re: Project X: QA Schedule and OOO",
        "timestamp": "2026-06-17T09:15:00Z",
        "body": (
            "Hi Sarah and John,\n\n"
            "The July 20 launch works, but I have some personal time off planned.\n"
            "I will be Out of Office (OOO) from July 5 to July 8.\n\n"
            "To make this work, I need the staging environment to be fully ready by July 12 so I can execute the automated test suites.\n"
            "My colleague Dave will cover any urgent bug checks while I am away from July 5-8.\n\n"
            "Thanks,\n"
            "Emily"
        ),
        "query": "What is the configuration variable name introduced by John to toggle between the mock server and the live Microsoft Graph API, and what is its default setting on the staging environment?",
        "ground_truth": "The configuration variable is `MS_GRAPH_USE_MOCK`. It is set to `true` on the staging environment."
    },
    {
        "sender": "John Doe <john.doe@inboxos.dev>",
        "recipient": "Emily Smith <emily.smith@inboxos.dev>, Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "subject": "Re: Project X: QA Schedule and OOO",
        "timestamp": "2026-06-17T16:45:00Z",
        "body": (
            "Hi Emily,\n\n"
            "Understood. I will ensure the staging environment is ready by July 10, which is two days before your July 12 deadline.\n\n"
            "Regarding the Microsoft Graph API token sync: if the staging credentials from Microsoft are delayed, I will set up a local Mock Server to simulate the token refresh responses so that QA testing isn't blocked. "
            "We should know if we need the Mock Server by July 8.\n\n"
            "Thanks,\n"
            "John"
        ),
        "query": "When is the Steering Committee MVP Demo scheduled, and by what date does John need to prepare the demo materials?",
        "ground_truth": "The Steering Committee MVP Demo is scheduled for July 15, 2026. John Doe must prepare the demo materials by July 14, 2026."
    },
    {
        "sender": "Marcus Vance <marcus.vance@inboxos.dev>",
        "recipient": "Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "subject": "Project X: Steering Committee Demo",
        "timestamp": "2026-06-18T11:00:00Z",
        "body": (
            "Hi Sarah,\n\n"
            "Just a reminder that we have the Steering Committee MVP Demo on July 15. They will want to see the progress on the Microsoft Graph integration.\n\n"
            "Does the mock server setup that John mentioned impact the demo or add to the $16,500 budget?\n\n"
            "Thanks,\n"
            "Marcus"
        ),
        "query": "Is the Gmail API integration included in the initial launch scope of Project X, and what is the plan for its future integration?",
        "ground_truth": "No, Gmail API integration is not in the scope for Phase 1 (initial launch) of Project X. It is postponed and will be planned for Phase 2."
    },
    {
        "sender": "Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "recipient": "Marcus Vance <marcus.vance@inboxos.dev>, John Doe <john.doe@inboxos.dev>",
        "subject": "Re: Project X: Steering Committee Demo",
        "timestamp": "2026-06-18T13:30:00Z",
        "body": (
            "Hi Marcus,\n\n"
            "No, the mock server setup will not exceed the budget. It is fully covered under the $16,500 allocation.\n\n"
            "John will prepare the demo materials by July 14, so we are ready for the Steering Committee on July 15. "
            "John, please make sure we have a clear fallback demo path in case Microsoft credentials are still pending.\n\n"
            "Best,\n"
            "Sarah"
        ),
        "query": "Does the setup of the Mock Server increase the final budget of Project X beyond the approved $16,500?",
        "ground_truth": "No, the mock server setup is fully covered under the approved $16,500 budget and does not increase the final costs beyond it."
    },
    {
        "sender": "Emily Smith <emily.smith@inboxos.dev>",
        "recipient": "John Doe <john.doe@inboxos.dev>, Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "subject": "Re: Project X: Mock Server QA Configuration",
        "timestamp": "2026-06-19T10:00:00Z",
        "body": (
            "Hi John and Sarah,\n\n"
            "If we use a mock server for the July 15 demo, the QA automation runs on staging will fail unless we have a toggle.\n\n"
            "Can we add an environment variable to toggle between the mock server and the live Microsoft Graph API? "
            "This will let us test the real token refresh flow once credentials arrive without changing code.\n\n"
            "Thanks,\n"
            "Emily"
        ),
        "query": "Why did John propose delaying the project launch, and what was the new agreed launch date?",
        "ground_truth": "John proposed delaying the launch due to latency concerns and token sync lag in the Microsoft Graph API's OAuth2 token refresh flow. The new agreed launch date is July 20, 2026."
    },
    {
        "sender": "John Doe <john.doe@inboxos.dev>",
        "recipient": "Emily Smith <emily.smith@inboxos.dev>, Sarah Jenkins <sarah.jenkins@inboxos.dev>",
        "subject": "Re: Project X: Mock Server QA Configuration",
        "timestamp": "2026-06-19T15:20:00Z",
        "body": (
            "Hi Emily,\n\n"
            "Great point. I have added a configuration toggle variable `MS_GRAPH_USE_MOCK` to the backend service.\n\n"
            "Setting `MS_GRAPH_USE_MOCK=true` will route all token synchronization calls to the mock server, while `MS_GRAPH_USE_MOCK=false` will use the real Microsoft Graph API endpoint. "
            "I have set it to `true` on staging for now.\n\n"
            "Thanks,\n"
            "John"
        ),
        "query": "What concern did Emily raise regarding automated tests if a mock server is used for the demo, and how was it resolved?",
        "ground_truth": "Emily raised concerns that automated QA tests run on staging would fail for real API flows if a mock server was used. This was resolved by John introducing an environment variable toggle (`MS_GRAPH_USE_MOCK`) to route calls to either the mock server (when `true`) or the live Microsoft Graph API (when `false`)."
    }
]

def main(output_filename="project_x_eval_dataset.csv"):
    print(f"Generating evaluation dataset for cohesive Project X conversation...")
    
    # Define columns
    fieldnames = [
        "Email_ID",
        "Sender",
        "Recipient",
        "Subject",
        "Body",
        "Timestamp",
        "Query",
        "GroundTruth"
    ]
    
    try:
        with open(output_filename, mode='w', newline='', encoding='utf-8') as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            
            for index, email_data in enumerate(EMAILS):
                # Generate unique email ID
                email_id = str(uuid.uuid4())
                
                row = {
                    "Email_ID": email_id,
                    "Sender": email_data["sender"],
                    "Recipient": email_data["recipient"],
                    "Subject": email_data["subject"],
                    "Body": email_data["body"],
                    "Timestamp": email_data["timestamp"],
                    "Query": email_data["query"],
                    "GroundTruth": email_data["ground_truth"]
                }
                writer.writerow(row)
                
        print(f"Successfully generated {len(EMAILS)} rows.")
        print(f"Dataset saved to: {os.path.abspath(output_filename)}")
        return 0
    except Exception as e:
        print(f"Error generating CSV: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
