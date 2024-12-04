# OpenapiComponentGen

OpenapiComponentGen is a JavaScript utility designed to generate reusable components from OpenAPI specifications. This tool simplifies the process of creating modular and maintainable API components, enhancing development efficiency.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## About

OpenapiComponentGen automates the extraction and generation of components from OpenAPI specifications. It parses OpenAPI documents and generates standardized components, promoting consistency and reusability across projects.

## Features

- **Component Extraction**: Parses OpenAPI specifications to extract and process components.
- **Reusable Modules**: Creates modular components stored in JSON format.
- **Predefined Input/Output**: Works with `input.json` for input and outputs the results to `output.json`.

## Installation

### Prerequisites

- **Node.js**: Ensure Node.js is installed on your system.
- **Git**: Required to clone the repository.

### Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/haavard-hoijord/OpenapiComponentGen.git
   cd OpenapiComponentGen
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

   This command installs the necessary dependencies specified in the `package.json` file.

## Usage

1. **Prepare Input**:

   - Place your OpenAPI specification into a file named `input.json` in the project root directory.

2. **Run the Generator**:

   Execute the following command to process the input and generate components:

   ```bash
   node ComponentGenerator.js
   ```

   - The results will be written to `output.json` in the project root directory.

3. **Integrate Components**:

   Use the `output.json` file as needed in your projects to ensure consistency and reusability.

## Contributing

As this repository is archived and read-only, contributions are no longer accepted. However, feel free to fork the repository for personal exploration and learning.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
