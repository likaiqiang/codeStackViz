# Project Overview

This project is a website tool designed to assist developers in reading source code. It can analyze any JavaScript or TypeScript project. You can search for a suitable GitHub repository and select an entry file. It will bundle the code and analyze global functions with a call stack exceeding three levels. Additionally, it provides code restoration and interpretation features, allowing users to gain a deeper understanding of the code execution process.

## Key Features

### Completed Features

- **Code Bundling**: The project can take an entry file and use Rollup to bundle the entire project's code.

- **Call Stack Analysis**: The project can analyze the bundled code, identify global functions with call stacks exceeding three levels, and generate corresponding reports.

- **Code Restoration**: Users can click on nodes in the report to restore the code and view the implementation of specific functions.

- **Code Interpretation**: The project integrates ChatGPT, allowing users to get code explanations and comments on top of code restoration to aid in understanding code logic.

### Work in Progress

- **Improved Interactivity**

- **Enhanced Bundling Performance**

## Getting Started

### Usage

1. Visit the website: [Project Website (Under Preparation)](https://)

2. Configure the entry file: Search for a GitHub repository on the website and select the entry file.

3. Run the analysis: Initiate the analysis process, and the tool will automatically bundle and analyze the code.

4. View the report: After analysis is complete, you can examine the call graph, restore the code, and use ChatGPT to explain the code.

## License

This project is licensed under the [License Name]. For more details, please refer to the [LICENSE](https://github.com/likaiqiang/codeStackViz/blob/main/LICENSE) file.

---

[中文](https://github.com/likaiqiang/codeStackViz/blob/main/README_CN.md)
