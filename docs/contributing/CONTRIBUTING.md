# 🤝 Contributing to InboxOS

Thank you for your interest in contributing to **InboxOS**! We are building the decision + execution layer for AI email automation, and we are absolutely thrilled to welcome you to our community. 

Whether you are fixing a small typo, adding a new AI provider, refactoring database queries, or writing unit tests, your contributions make a massive difference. We are especially committed to supporting first-time open-source contributors, so please don't hesitate to jump in!

---

## 🚀 Welcome First-Time Contributors!

If you are new to Git, GitHub, or open-source in general, welcome! We would love to help you get started:
* **Good First Issues:** Look for issues labeled [`good-first-issue`](https://github.com/sakshi8778/InboxOS/labels/good-first-issue) or [`help-wanted`](https://github.com/sakshi8778/InboxOS/labels/help-wanted). These are scoped to be simple, self-contained, and great for learning the codebase.
* **Friendly Review:** We promise to review every pull request with encouragement, constructive feedback, and respect. No question is too basic!

---

## 🛠️ Step-by-Step Contribution Workflow

### 1. Fork the Repository
Click the **Fork** button in the top-right corner of the [InboxOS Repository](https://github.com/sakshi8778/InboxOS) to create a copy of the project in your own GitHub account.

### 2. Clone and Setup Locally
Clone your fork to your local machine and set up the development environment:
```bash
git clone https://github.com/YOUR_USERNAME/InboxOS.git
cd InboxOS
```

Refer to the [LOCAL_SETUP.md](../setup/LOCAL_SETUP.md) for full instructions on setting up environment variables, running migrations, and launching the frontend and backend servers.

### 3. Create a Branch
Always create a new branch for your changes rather than working directly on `main`. Follow our branch naming convention below.

---

## 🌿 Git Branch Naming Convention

Keep branch names descriptive and prefixed by the type of change you are making:

| Prefix | Purpose | Example Branch Name |
| :--- | :--- | :--- |
| `feat/` | A new feature or capability | `feat/issue-45-add-ollama-support` |
| `fix/` | A bug fix or patch | `fix/issue-12-cors-origin-issue` |
| `docs/` | Documentation changes only | `docs/update-contributing-guide` |
| `refactor/` | Code reorganization, optimization, or cleanup | `refactor/cleanup-auth-middleware` |
| `test/` | Adding or updating tests | `test/add-profile-unit-tests` |
| `chore/` | Maintenance tasks, dependency updates, configuration | `chore/update-typescript-version` |

---

## ✍️ Commit Message Format

We follow the **Conventional Commits** specification. This helps automate release logs, changelogs, and keeps history clean and readable.

A conventional commit message should be structured as follows:
```
<type>(<scope>): <short description>

[optional body describing the 'why' of the change]

[optional footer linking to issues, e.g., Closes #123]
```

### Allowed Types:
* `feat`: A new feature (e.g., `feat(api): add Celery background tasks for rules`)
* `fix`: A bug fix (e.g., `fix(frontend): adjust alignment of email viewer layout`)
* `docs`: Documentation updates (e.g., `docs(readme): correct production deployment commands`)
* `style`: Styling changes that do not affect code logic (whitespace, formatting, etc.)
* `refactor`: Code changes that neither fix a bug nor add a feature
* `perf`: A code change that improves performance
* `test`: Adding missing tests or correcting existing tests
* `chore`: Build system, auxiliary tools, or dependency updates

### Scope (Optional):
The scope should refer to the package, component, or file affected (e.g., `api`, `frontend`, `db`, `rules`).

### Example Commit Messages:
```
feat(rules): implement rule condition evaluation for category filtering

Implemented category comparison using exact matches and wildcard regexes.
Closes #42
```
```
fix(auth): resolve jwt validation error when session expires
```

---

## 🔍 Pull Request (PR) Review Process

When you're ready, submit a Pull Request to merge your branch back into our `main` branch.

### 📋 Before Submitting your PR:
1. **Sync with upstream:** Make sure your branch is up-to-date with `origin/main` to avoid merge conflicts:
   ```bash
   git fetch origin
   git merge origin/main
   ```
2. **Run Linting & Tests:** Ensure all tests pass and there are no compilation errors:
   ```bash
   # In the backend directory
   npm run typecheck
   
   # In the frontend directory
   npm run typecheck
   ```
3. **Format Code:** Keep code styling consistent.

### 📬 Submitting the PR:
1. Provide a clear, descriptive title using conventional commits style (e.g., `feat(api): implement WhatsApp notifier`).
2. Fill out the PR template describing **what** you changed, **why** you changed it, and **how** you verified it.
3. Link relevant issues in the description (e.g., `Closes #123`).

### 💬 Review & Merge:
* **Peer Review:** At least one core maintainer will review your PR. They may ask for modifications, ask questions, or approve it.
* **Continuous Integration:** Automated tests will run on your PR. All status checks must pass before it is merged.
* **Addressing Feedback:** If changes are requested, simply make them on your local branch and push them; your PR will update automatically.
* **Merging:** Once approved and green, a maintainer will merge your PR. Congratulations! Your code is now part of InboxOS!

---

## 💬 Getting Help
If you get stuck, need help with Git, or want to discuss a feature design before writing code, feel free to open a [GitHub Discussion](https://github.com/sakshi8778/InboxOS/discussions) or join our community Discord. We are here to help!
