# Docker Console

A simple and lightweight tool for running Docker commands via a user-friendly interface, enabling seamless container management for developers and system administrators. This tool is designed to simplify your workflow by providing an interactive console that integrates seamlessly with your existing Docker environment, saving time and reducing complexity for both beginners and seasoned professionals.

## Features

- **Execute Docker Commands**: Easily run common Docker commands with intuitive inputs.
- **Container Management**: Start, stop, restart, and monitor containers with minimal effort.
- **Interactive Console**: A terminal-like interface for direct command execution, tailored to streamline repetitive tasks.
- **Cross-Platform**: Fully compatible with Linux, macOS, and Windows environments, making it versatile for various development setups.
- **Custom Command Integration**: Extend the functionality with user-defined commands or scripts to adapt to specific project needs.
- **Graphical User Interface (GUI)**: A clear, web-based interface to manage containers, networks, volumes, and more.
- **Project Support**: Add and manage Docker Compose configuration files for easy multi-container setups (excluding Swarm-specific configurations).
- **Files Integration**: Containers started via Projects automatically mount files from the `Files` section.
- **Network and Volume Pruning**: Easily prune unused networks and volumes directly from the interface.

## Quick Start

Get Docker Console running in under a minute:

```bash
# One-line installation
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash

# Open in browser
open http://localhost:7293
```

That's it! The installation script handles everything automatically.

## Prerequisites

To use Docker Console, ensure the following:

1. **Docker Installed**:
    - Install Docker on your system by following the [official guide](https://docs.docker.com/get-docker/). Make sure the Docker Daemon is running.
2. **System Requirements**:
    - Linux, macOS, or Windows with Docker Daemon running.
3. **Basic Docker Knowledge**:
    - Familiarity with basic Docker commands and concepts is recommended for a smoother experience.

## Installation

Docker Console provides an automated installation script for easy setup. You can install it using one of the following methods:

### Quick Installation (Recommended)

1. Download and run the installation script:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash
   ```

   Or if you prefer to download and inspect the script first:

   ```bash
   wget https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh
   chmod +x install.sh
   ./install.sh
   ```

2. The script will automatically:
   - Check for Docker installation and status
   - Pull the latest Docker Console image
   - Handle existing container updates intelligently
   - Resolve port conflicts automatically
   - Start the container with optimal settings

### Installation Options

The installation script supports various customization options:

```bash
# Install with default settings (port 7293)
./install.sh

# Install specific version
./install.sh --tag 1.3.5

# Install on custom port
./install.sh --port 8080

# Install with custom configuration directory
./install.sh --config-dir /home/user/docker-console

# Combine multiple options
./install.sh --tag 1.3.5 --port 8080 --config-dir /home/user/docker-console

# View all available options
./install.sh --help
```

### One-Line Installation with Parameters

You can also pass parameters directly through the curl command using `bash -s --`:

```bash
# Install with default settings
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash

# Install specific version
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash -s -- --tag 1.3.5

# Install on custom port
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash -s -- --port 8080

# Install with custom configuration directory
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash -s -- --config-dir /home/user/docker-console

# Combine multiple options
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash -s -- --tag 1.3.5 --port 8080

# Get help information
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash -s -- --help
```

**Note**: The `bash -s --` syntax allows passing arguments to the script when running through a pipe. Everything after the `--` gets passed as arguments to the installation script.

### Automated Installation

For CI/CD or automated deployments, you can use the `AUTO_CONFIRM` environment variable to automatically accept all prompts:

```bash
# Automated installation with auto-confirmation
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | AUTO_CONFIRM=true bash

# Automated installation with parameters
curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | AUTO_CONFIRM=true bash -s -- --port 8080
```

### Manual Installation

If you prefer manual installation, you can also run Docker Console directly:

```bash
docker run -d --restart always -p 7293:7293 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /docker-console:/docker-console \
  --name docker-console \
  plankroot/docker-console
```

### Installation Features

The automated installer provides:
- **Smart Updates**: Compares running container with latest image
- **Port Conflict Resolution**: Automatically finds available ports
- **Version Management**: Install specific versions or latest
- **Cross-Platform**: Works on Linux, macOS, and Windows (WSL)
- **Zero Downtime**: Skips restart if already running latest version
- **Interactive Prompts**: Guides you through configuration choices

## Usage

- Access the Docker Console's GUI by visiting `http://localhost:7293` in your web browser.
- Use the GUI to:
    - View and manage containers, networks, volumes, and images.
    - Start, stop, restart, and delete containers with ease.
    - Inspect logs and monitor container statuses.
    - Execute shell commands directly within a container.
    - Manage projects with Docker Compose files.

### Example GUI Features

The Docker Console's GUI includes:

1. **Containers Panel**:
    - Lists all running and stopped containers with details like ports, statuses, and creation times.
    - Allows quick actions such as start, stop, restart, delete, and open terminal.

2. **Projects Panel**:
    - Supports uploading and managing Docker Compose configuration files.
    - Excludes Swarm-specific features for compatibility.
    - Automatically mounts files from the `Files` section into containers started via Projects.

3. **Networks Panel**:
    - Displays all Docker networks and their associated containers.
    - Manage network configurations effortlessly.
    - Supports pruning unused networks directly from the interface.

4. **Volumes Panel**:
    - View and manage Docker volumes.
    - Remove unused volumes directly through the interface.
    - Supports pruning unused volumes with a single click.

5. **Images Panel**:
    - Lists all downloaded images.
    - Remove or pull new images via the GUI.

6. **Logs and Terminal**:
    - View detailed logs for any container.
    - Open an interactive terminal session for debugging and management.

7. **Files Section**:
    - Manage files that can be mounted to containers.
    - Automatically integrates with Projects to simplify workflows.

### Example

1. Install Docker Console using the automated script:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/isatiso/docker-console/refs/heads/master/install.sh | bash
   ```

2. The script will guide you through the installation and automatically start the service.

3. Open your web browser and navigate to:

   ```
   http://localhost:7293
   ```

   (Or your custom port if you specified one during installation)

4. Use the intuitive GUI to:
    - Monitor running containers.
    - Start and stop services.
    - View logs and troubleshoot issues.
    - Manage Docker Compose projects and related files.

## Contributing

Contributions are welcome! Follow these steps to contribute:

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature-name
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add feature description"
   ```

4. Push to your fork and create a pull request:

   ```bash
   git push origin feature-name
   ```

5. Collaborate on the pull request with the maintainers to finalize changes.

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it within the terms of the license.

## Contact

For any questions or feedback, feel free to create an issue in the repository or reach out to the maintainer. We appreciate your input and are here to support your experience with Docker Console.

If you encounter any bugs or wish to suggest features, don't hesitate to open a GitHub issue. Active engagement from the community helps make this tool better for everyone!

