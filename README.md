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

## Prerequisites

To use Docker Console, ensure the following:

1. **Docker Installed**:
    - Install Docker on your system by following the [official guide](https://docs.docker.com/get-docker/). Make sure the Docker Daemon is running.
2. **System Requirements**:
    - Linux, macOS, or Windows with Docker Daemon running.
3. **Basic Docker Knowledge**:
    - Familiarity with basic Docker commands and concepts is recommended for a smoother experience.

## Installation

You can run Docker Console directly using the pre-built image available on Docker Hub:

1. Pull the Docker image:

   ```bash
   docker pull plankroot/docker-console
   ```

2. Run the Docker Console container in the background with persistent settings:

   ```bash
   docker run -d --restart always -p 7293:7293 -v /var/run/docker.sock:/var/run/docker.sock -v /docker-console:/docker-console --name docker-console plankroot/docker-console
   ```

This command will:
- Run the container in detached mode (`-d`).
- Automatically restart the container on system reboot (`--restart always`).
- Expose the service on port `7293`.
- Mount the Docker socket and a configuration directory for persistent settings.

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

1. Start the Docker Console:

   ```bash
   docker run -d --restart always -p 7293:7293 -v /var/run/docker.sock:/var/run/docker.sock -v /etc/docker-console:/etc/docker-console --name docker-console plankroot/docker-console
   ```

2. Open your web browser and navigate to:

   ```
   http://localhost:7293
   ```

3. Use the intuitive GUI to:
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

If you encounter any bugs or wish to suggest features, don’t hesitate to open a GitHub issue. Active engagement from the community helps make this tool better for everyone!

