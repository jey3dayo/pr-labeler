# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

Intelligent PR labeling with automatic size checks, categorization, and risk assessment for GitHub Actions.

🇬🇧 [English](README.md) | 🇯🇵 [日本語](README.ja.md)

## 🚀 Key Features

- **📏 Automatic PR Labeling**: Apply size labels (S/M/L/XL/XXL) based on PR additions
- **🏷️ Flexible Categorization**: Automatically categorize PRs by type (tests, docs, CI/CD, dependencies, etc.)
- **📁 Directory-Based Labeling**: Apply labels based on changed file paths using glob patterns
- **⚠️ Risk Assessment**: Identify high-risk changes (core changes without tests)
- **🌐 Multi-language Support**: English and Japanese output for summaries, comments, and logs

## 📋 Quick Start

<a id="使用方法"></a>
<a id="-使用方法"></a>
<a id="usage"></a>

### Minimal Configuration

Add this workflow to `.github/workflows/pr-check.yml`:

```yaml
name: PR Size Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      contents: read        # Read files
      pull-requests: write  # Manage labels
      issues: write         # Post comments

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### ⚠️ Label Creation Required

**Before first use**, ensure labels exist in your repository:

- **Option 1**: Manually create labels in **Issues** → **Labels** (see [Troubleshooting](docs/troubleshooting.md#labels-not-applied) for label list)
- **Option 2**: Enable automatic label creation in `.github/pr-labeler.yml`:

  ```yaml
  # .github/pr-labeler.yml
  labels:
    create_missing: true  # Auto-create missing labels
  ```

### Next Steps

- 📖 **Configure parameters**: See [Configuration Guide](docs/configuration.md) for all input options
- 🚀 **Advanced scenarios**: See [Advanced Usage](docs/advanced-usage.md) for fork PRs, conditional execution, and more

## 🔒 Required Permissions

<a id="必要な権限"></a>
<a id="-必要な権限"></a>
<a id="permissions"></a>

This action requires the following permissions:

```yaml
permissions:
  pull-requests: write  # Label management
  issues: write         # Comment posting
  contents: read        # File reading
```

**Note**: For fork PRs, use the `pull_request_target` event. See [Advanced Usage - Fork PR Handling](docs/advanced-usage.md#fork-pr-handling) for details.

## 🏷️ Automatic Labels

<a id="自動適用ラベル"></a>
<a id="-自動適用ラベル"></a>
<a id="labels"></a>

### Size Labels (Exclusive)

Applied based on total PR additions:

- `size/small` - < 200 lines
- `size/medium` - 200-499 lines
- `size/large` - 500-999 lines
- `size/xlarge` - 1000-2999 lines
- `size/xxlarge` - ≥ 3000 lines

### Category Labels (Additive)

Applied based on changed file patterns:

- `category/tests` - Test file changes
- `category/ci-cd` - CI/CD configuration
- `category/documentation` - Documentation changes
- `category/config` - Configuration files
- `category/spec` - Specification documents
- `category/dependencies` - Dependency files (Node.js, Go, Python, Rust, Ruby)

### Risk Labels (Exclusive)

Applied based on change risk:

- `risk/high` - Core changes without tests
- `risk/medium` - Configuration file changes

### Violation Labels

Applied when limits are exceeded:

- `auto:large-files` - Files exceed size/line limits
- `auto:too-many-files` - PR has too many files

**Customization**: Adjust thresholds and labels in [Configuration Guide](docs/configuration.md#label-thresholds-defaults).

## 🔧 Input Parameters

<a id="入力パラメータ"></a>
<a id="-入力パラメータ"></a>
<a id="input-parameters"></a>

For detailed parameter documentation, see **[Configuration Guide](docs/configuration.md)**.

**Quick Reference**:

- **Basic Limits**: `file_size_limit`, `file_lines_limit`, `pr_additions_limit`, `pr_files_limit`
- **Label Control**: `size_enabled`, `complexity_enabled`, `category_enabled`, `risk_enabled`
- **Workflow Failure**: `fail_on_large_files`, `fail_on_too_many_files`, `fail_on_pr_size`
- **Directory Labeling**: `enable_directory_labeling`, `auto_create_labels`
- **Multi-language**: `language` (en/ja)

## 📝 Advanced Usage

<a id="高度な使用例"></a>
<a id="-高度な使用例"></a>
<a id="advanced-usage"></a>

For real-world examples and advanced configurations, see **[Advanced Usage Guide](docs/advanced-usage.md)**.

**Common Scenarios**:

- [Fork PR Handling](docs/advanced-usage.md#fork-pr-handling) - `pull_request_target` configuration
- [Conditional Execution](docs/advanced-usage.md#conditional-execution) - Skip by label/branch/path
- [Strict Mode](docs/advanced-usage.md#strict-mode) - Fail workflow on violations
- [Selective Label Enabling](docs/advanced-usage.md#selective-label-enabling) - Enable/disable label types individually
- [Directory-Based Labeling](docs/advanced-usage.md#directory-based-labeling) - Label by file path patterns
- [Multi-language Support](docs/advanced-usage.md#multi-language-support) - Japanese/English output

## 📚 Documentation

- **[Configuration Guide](docs/configuration.md)** - Complete input parameters, output variables, and defaults
- **[Advanced Usage Guide](docs/advanced-usage.md)** - Real-world examples and advanced scenarios
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues and solutions
- **[API Documentation](docs/API.md)** - Internal API reference
- **[Release Process](docs/release-process.md)** - How to release new versions

## 🤝 Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change.

Please ensure tests pass and follow the existing code style.

## 📄 License

MIT

## 🙏 Acknowledgments

This project uses the following libraries:

- [neverthrow](https://github.com/supermacro/neverthrow) - Railway-Oriented Programming
- [minimatch](https://github.com/isaacs/minimatch) - Pattern matching
- [bytes](https://github.com/visionmedia/bytes.js) - Size parsing
- [@actions/core](https://github.com/actions/toolkit) - GitHub Actions integration
- [@actions/github](https://github.com/actions/toolkit) - GitHub API
