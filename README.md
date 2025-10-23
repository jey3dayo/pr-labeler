# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

**Intelligent PR analysis and labeling for GitHub Actions** - Automatically categorize, size, and assess risk of your pull requests.

🇬🇧 [English](README.md) | 🇯🇵 [日本語](README.ja.md)

## ✨ Why PR Labeler?

Streamline your PR review process with intelligent automation:

- **📏 Smart Size Detection**: Automatically label PRs by size (small → xxlarge) to help reviewers prioritize
  - Example: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **🏷️ Auto-Categorization**: Classify changes by type (tests, docs, CI/CD, dependencies) for quick filtering
  - Example: `category/tests`, `category/documentation`, `category/ci-cd`, `category/dependencies`
- **⚠️ Risk Assessment**: Flag high-risk changes (core modifications without tests) before merge
  - Example: `risk/high` (core changes without test updates), `risk/medium` (config/infrastructure changes)
- **📁 Path-Based Labels**: Custom labels based on file paths using flexible glob patterns
  - Example: `frontend/**` → `team/frontend`, `backend/**` → `team/backend`
- **🚦 Quality Gates**: Optional workflow failures for oversized PRs or policy violations
  - Example: `fail_on_pr_size: "xlarge"` fails workflow for xlarge or larger PRs
- **🌐 Multi-language**: Full support for English and Japanese output

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

### 3. Customize (Optional)

Want more control? Check these guides:

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

| Label                    | Matches        | Example                |
| ------------------------ | -------------- | ---------------------- |
| `category/tests`         | Test files     | `**/*.test.ts`         |
| `category/ci-cd`         | CI/CD configs  | `.github/workflows/**` |
| `category/documentation` | Docs           | `docs/**`, `*.md`      |
| `category/config`        | Config files   | `*.config.js`, `.env`  |
| `category/spec`          | Specifications | `.kiro/specs/**`       |
| `category/dependencies`  | Lock files     | `package-lock.json`    |

### Risk Labels

Flag potential issues:

- `risk/high` - Core changes without corresponding test updates
- `risk/medium` - Configuration or infrastructure changes

### Violation Labels

When limits exceeded:

- `auto/large-files` - Individual files too large
- `auto/too-many-files` - Too many files changed

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

    # Localization
    language: "en"                # Output language (en/ja)
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
