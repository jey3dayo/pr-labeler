# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

**Intelligent PR analysis and labeling for GitHub Actions** - Automatically categorize, size, and assess risk of your pull requests.

🇬🇧 [English](README.md) | 🇯🇵 [日本語](README.ja.md)

## ✨ Why PR Labeler?

Streamline your PR review process with intelligent automation:

- **📏 Smart Size Detection**: Automatically label PRs by size (small → xxlarge) to help reviewers prioritize
  - **Excludes**: Lock files, generated files, test files, and documentation metadata for accurate code size measurement
  - Example: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **🏷️ Auto-Categorization**: Classify changes by type (tests, docs, CI/CD, config, specs, dependencies) for quick filtering
  - **All files**: Including metadata files (`.kiro/`, `.claude/`, etc.) for comprehensive classification
  - Example: `category/tests`, `category/documentation`, `category/ci-cd`, `category/config`, `category/spec`
- **⚠️ Risk Assessment**: Flag high-risk changes (core modifications without tests) before merge
  - **Code files only**: Excludes documentation and metadata to focus on executable code risks
  - Example: `risk/high` (core changes without test updates), `risk/medium` (config/infrastructure changes)
- **🧠 Complexity Insights**: Measure ESLint complexity for changed files and surface `complexity/high` labels (opt-in)
- **📁 Path-Based Labels**: Custom labels based on file paths using flexible glob patterns
  - Example: `frontend/**` → `team/frontend`, `backend/**` → `team/backend`
- **🏷️ Auto Label Provisioning**: Automatically create and sync labels with default metadata—no manual setup required
- **🚦 Workflow Quality Gates**: Enforce policy with `fail_on_pr_size`, `fail_on_large_files`, and `fail_on_too_many_files`
- **📝 GitHub Actions Summary**: Publish rich PR analytics, large file tables, and improvement suggestions to the Actions Summary page
- **🌐 Multi-language Output**: Automatically switch between English and Japanese using the `language` input or `LANGUAGE/LANG` environment

## 🚀 Quick Start

Get started in 2 minutes:

### 1. Create Workflow File

Add `.github/workflows/pr-labeler.yml`:

```yaml
name: PR Labeler

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest

    permissions:
      contents: read        # Read PR files
      pull-requests: write  # Apply labels
      issues: write         # Post comments

    steps:
      - uses: actions/checkout@v4
      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Language setting (defaults to English)
          # language: "ja"  # Uncomment for Japanese output
```

### 2. What You Get

Once configured, every PR automatically receives:

- **Size labels**: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **Category labels**: `category/tests`, `category/docs`, `category/ci-cd`, `category/dependencies`, etc.
- **Risk labels**: `risk/high`, `risk/medium` (when applicable)
- **Complexity labels**: `complexity/high` when ESLint complexity thresholds are exceeded (if enabled)
- **GitHub Actions Summary**: Consolidated metrics, violation tables, and best-practice reminders directly in CI results

### 3. Customize (Optional)

Unlock advanced controls:

- Selectively enable size, complexity, category, and risk labels per workflow run
- Auto-create and maintain labels with consistent colors/descriptions
- Fail workflows based on size, file count, additions, or label policy breaches
- Publish GitHub Actions Summary entries featuring violation tables and best-practice reminders
- Localize logs, summaries, and comments via `language` input or locale environment variables

Need deeper guidance? Check these guides:

- 📖 [Configuration Guide](docs/configuration.md) - All input parameters and thresholds
- 🔧 [Advanced Usage](docs/advanced-usage.md) - Fork PRs, strict mode, custom workflows

## 🔒 Permissions

Required GitHub Actions permissions:

```yaml
permissions:
  contents: read        # Read PR files
  pull-requests: write  # Apply/remove labels
  issues: write         # Post PR comments
```

**Fork PRs**: Use `pull_request_target` event. See [Fork PR Handling](docs/advanced-usage.md#fork-pr-handling).

## 🏷️ Labels Applied

### Size Labels (additions-based)

| Label          | Lines Added | Use Case          |
| -------------- | ----------- | ----------------- |
| `size/small`   | < 200       | Quick reviews     |
| `size/medium`  | 200-499     | Normal reviews    |
| `size/large`   | 500-999     | Requires focus    |
| `size/xlarge`  | 1000-2999   | Split recommended |
| `size/xxlarge` | ≥ 3000      | Should be split   |

### Category Labels

Automatically detect change types:

| Label                     | Matches        | Example                    |
| ------------------------- | -------------- | -------------------------- |
| `category/tests`          | Test files     | `**/*.test.ts`             |
| `category/ci-cd`          | CI/CD configs  | `.github/workflows/**`     |
| `category/documentation`  | Docs           | `docs/**`, `*.md`          |
| `category/config`         | Config files   | `*.config.js`, `.env`      |
| `category/spec`           | Specifications | `.kiro/specs/**`           |
| `category/dependencies`   | Lock files     | `package-lock.json`        |
| `category/feature`        | New features   | `src/features/**`          |
| `category/infrastructure` | Infrastructure | `Dockerfile`, `.github/**` |
| `category/security`       | Security       | `**/auth*/**`, `.env*`     |

See the [Category Guide](docs/categories.md) for detailed information about category labels.

### Risk Labels

Flag potential issues:

- `risk/high` - Core changes without corresponding test updates
- `risk/medium` - Configuration or infrastructure changes

### Violation Labels

When limits exceeded:

- `auto/large-files` - Individual files too large
- `auto/too-many-files` - Too many files changed
- `auto:too-many-lines` - Individual files exceed configured line limits
- `auto:excessive-changes` - Total additions exceed configured thresholds

**Customize**: All thresholds and labels configurable. See [Configuration Guide](docs/configuration.md#label-thresholds-defaults).

## ⚙️ Configuration

### Common Options

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # Size Limits
    file_size_limit: "100KB"      # Max file size
    file_lines_limit: "500"       # Max lines per file
    pr_additions_limit: "5000"    # Max total additions
    pr_files_limit: "50"          # Max changed files

    # Label Control
    size_enabled: "true"          # Enable size labels
    category_enabled: "true"      # Enable category labels
    risk_enabled: "true"          # Enable risk labels
    complexity_enabled: "false"   # Complexity labels (off by default)

    # Quality Gates
    fail_on_pr_size: "xlarge"     # Fail if PR too large
    fail_on_large_files: "true"   # Fail if files exceed limits
    fail_on_too_many_files: "true" # Fail if too many files are changed
    enable_summary: "true"        # Publish GitHub Actions Summary
    comment_on_pr: "auto"         # Auto-detect when to comment (auto/always/never)

    # Localization
    language: "en"                # Output language (en/ja)
    # Fallback: LANGUAGE / LANG env vars are respected when input omitted
```

### Advanced Features

- **Directory-Based Labeling**: Apply custom labels by file path patterns
- **Fork PR Support**: Secure handling with `pull_request_target`
- **Conditional Execution**: Skip checks by label, branch, or path
- **Custom Thresholds**: Fine-tune all size and complexity limits

👉 **Full documentation**: [Configuration Guide](docs/configuration.md) | [Advanced Usage](docs/advanced-usage.md)

## 📚 Documentation

| Guide                                        | Description                       |
| -------------------------------------------- | --------------------------------- |
| [Configuration Guide](docs/configuration.md) | All inputs, outputs, and defaults |
| [Advanced Usage](docs/advanced-usage.md)     | Real-world examples and patterns  |
| [Troubleshooting](docs/troubleshooting.md)   | Common issues and solutions       |
| [API Reference](docs/API.md)                 | Internal API documentation        |
| [Release Process](docs/release-process.md)   | Version management                |

## 🤝 Contributing

Contributions welcome! Please:

1. Open an issue for major changes
2. Ensure all tests pass
3. Follow existing code style

## 📄 License

MIT License - see repository for details.

## 🙏 Built With

- [neverthrow](https://github.com/supermacro/neverthrow) - Type-safe error handling
- [minimatch](https://github.com/isaacs/minimatch) - Glob pattern matching
- [bytes](https://github.com/visionmedia/bytes.js) - Size parsing utilities
- [@actions/toolkit](https://github.com/actions/toolkit) - GitHub Actions SDK
