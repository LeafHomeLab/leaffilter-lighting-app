# Contributing to LeafFilter Lighting App

Welcome to the team! This guide walks you through everything you need to know to start contributing. No prior Git experience required.

---

## 🚀 First-Time Setup

### 1. Install Git
Download and install Git from [git-scm.com](https://git-scm.com/downloads). Use the default settings during installation.

### 2. Clone the Repository
Open a terminal (PowerShell on Windows, Terminal on Mac) and run:

```bash
git clone https://github.com/LeafHomeLab/leaffilter-lighting-app.git
cd leaffilter-lighting-app
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the App Locally
```bash
npm run dev
```
This starts a local server. Open the URL it shows (usually `http://localhost:5173`) in your browser to see the app.

---

## 📋 How We Work (The Workflow)

We follow a simple rule: **never edit `main` directly**. Instead, you create a separate branch, make your changes there, and then open a Pull Request for review.

Here's the full process:

### Step 1 — Pull the Latest Code
Before starting any work, always grab the latest changes:

```bash
git checkout dev
git pull
```

### Step 2 — Create a Branch for Your Work
Create a new branch with a descriptive name:

```bash
git checkout -b feature/your-branch-name
```

**Branch naming examples:**

| What you're doing | Branch name |
|-------------------|-------------|
| Adding a new feature | `feature/add-color-picker` |
| Fixing a bug | `fix/broken-preview` |
| Updating docs | `docs/update-readme` |
| Cleaning up code | `refactor/simplify-scenes` |

### Step 3 — Make Your Changes
Edit files as needed. Save your work frequently.

### Step 4 — Commit Your Changes
After making changes, save them to Git:

```bash
git add .
git commit -m "A short description of what you changed"
```

**Good commit messages:**
- ✅ `"Add sunset lighting scene"`
- ✅ `"Fix preview not loading on mobile"`
- ❌ `"stuff"`
- ❌ `"changes"`

### Step 5 — Push to GitHub
Send your branch to GitHub:

```bash
git push -u origin feature/your-branch-name
```

(You only need `-u origin feature/your-branch-name` the first time. After that, just `git push`.)

### Step 6 — Open a Pull Request (PR)
1. Go to [the repository on GitHub](https://github.com/LeafHomeLab/leaffilter-lighting-app)
2. You'll see a yellow banner saying **"Compare & pull request"** — click it
3. Write a short title and description of what you changed
4. Click **"Create pull request"**
5. Wait for a teammate to review and approve

### Step 7 — Merge
Once your PR is approved:
1. Click **"Merge pull request"** on GitHub
2. Click **"Delete branch"** to clean up

That's it! Your changes are now in the project. 🎉

---

## ⚠️ Handling Merge Conflicts

Conflicts happen when two people edit the same part of a file. Don't panic — here's how to fix them:

### 1. Update your branch
```bash
git checkout dev
git pull
git checkout your-branch-name
git merge dev
```

### 2. If Git says there's a conflict
Open the conflicting file. You'll see something like this:

```
<<<<<<< HEAD
  Your version of the code
=======
  The other person's version
>>>>>>> dev
```

### 3. Fix it
- Decide which version to keep (or combine them)
- Delete the `<<<<<<<`, `=======`, and `>>>>>>>` markers
- Save the file

### 4. Finish the merge
```bash
git add .
git commit -m "Resolve merge conflict"
git push
```

---

