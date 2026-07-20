# GitHub Development Workflow

## 1. Create a New Feature

```bash
git checkout develop
git fetch origin
git pull --ff-only origin develop

git checkout -b feat/<feature-name>
git push -u origin feat/<feature-name>
```

Example:

```bash
git checkout -b feat/chart-of-accounts
```

---

## 2. Work Normally

```bash
git add .
git commit -m "FEAT: implement Chart of Accounts"
git push
```

Repeat until finished.

---

## 3. Update Feature Branch

Check if `develop` has new commits.

```bash
git fetch origin
git log HEAD..origin/develop --oneline
```

- **No output** → Already up to date ✅
- **Has commits** → Update your feature branch:

```bash
git merge origin/develop
git push
```

> **Do not use `rebase`** on an active feature branch with an existing PR.

---

## 4. Before Creating a PR

Verify your branch is up to date:

```bash
git fetch origin
git log HEAD..origin/develop --oneline
```

See what your PR will contain:

```bash
git log origin/develop..HEAD --oneline
```

Create PR:

```text
feat/<feature-name> → develop
```

Include the QA Summary.

---

## 5. After Merge

```bash
git checkout develop
git pull --ff-only origin develop

git branch -d feat/<feature-name>
git push origin --delete feat/<feature-name>
```

---

# Quick Reference

| Command                                  | Purpose                                     |
| ---------------------------------------- | ------------------------------------------- |
| `git fetch origin`                       | Get latest remote updates                   |
| `git log HEAD..origin/develop --oneline` | Check if feature branch is behind `develop` |
| `git log origin/develop..HEAD --oneline` | See commits included in your PR             |
| `git merge origin/develop`               | Update feature branch (Recommended)         |
| `git push`                               | Push changes                                |
