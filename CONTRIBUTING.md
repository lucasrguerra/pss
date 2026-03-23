# Contributing to Process Scheduler Simulator (PSS)

First of all, thank you for considering contributing to the Process Scheduler Simulator! It's people like you that make open-source software such a great community to learn, inspire, and create.

This document provides guidelines and instructions for contributing to this project, in accordance with the Journal of Open Source Software (JOSS) requirements.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for PSS. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

If you find a bug, please create an issue on GitHub and include:
- A clear and descriptive title.
- Exact steps to reproduce the problem.
- What you expected to happen, and what actually happened.
- Screenshots or console logs if applicable.
- Operating system and browser version.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

To suggest an enhancement, open a new issue and include:
- A clear and descriptive title.
- A detailed description of the proposed functionality.
- Why this enhancement would be useful to most users.
- Any potential alternatives you have considered.

### Setting up the Development Environment

To contribute code, you'll need to set up the project locally.

#### Prerequisites
- [Node.js](https://nodejs.org/) (Version 20 or higher recommended)
- npm (Version 10 or higher)

#### Installation Steps

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pss.git
   cd pss
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### Testing

PSS uses Vitest for testing. Before submitting any changes, ensure that all tests pass:

```bash
# Run unit tests
npm test

# Run tests with coverage report
npm run test:coverage
```

If you add a new feature, please include appropriate tests covering the new functionality.

### Submitting a Pull Request

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```
2. Make your coding changes.
3. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add awesome new feature"
   ```
4. Push your branch to your fork on GitHub:
   ```bash
   git push origin feature/my-awesome-feature
   ```
5. Open a Pull Request from your fork to the `main` branch of the original PSS repository. Include a detailed description of your changes and link any related issues.

## Need Help?

If you have questions about how to contribute or how to use the software, please open an Issue with the `question` label.

Thank you for contributing!
