#!/bin/bash

# Docker Console Installation Script
# Script for installing and starting docker-console via Docker

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
CONTAINER_NAME="docker-console"
IMAGE_NAME="plankroot/docker-console"
IMAGE_TAG="latest"
HOST_PORT="7293"
CONTAINER_PORT="7293"
CONFIG_DIR="/docker-console"

# Shell-compatible read function
# This function handles the difference between bash and zsh read commands
read_input() {
    local prompt="$1"
    local options="$2"
    local var_name="$3"
    
    # Check for auto-confirm mode (useful for CI/CD)
    if [ "$AUTO_CONFIRM" = "true" ]; then
        if [[ "$options" == *"-n 1 -r"* ]]; then
            REPLY="Y"
            echo "${prompt}${REPLY} [auto-confirmed]"
        else
            if [ -n "$var_name" ]; then
                eval "$var_name=''"
            else
                REPLY=""
            fi
            echo "${prompt}[auto-confirmed]"
        fi
        return 0
    fi
    
    # Check if we're in zsh
    if [ -n "$ZSH_VERSION" ]; then
        # zsh syntax
        if [[ "$options" == *"-n 1 -r"* ]]; then
            # For single character input in zsh
            printf "%s" "$prompt"
            read -k 1 REPLY
            echo  # Add newline after single character input
        else
            # For normal input in zsh
            if [ -n "$var_name" ]; then
                read "?${prompt}" "$var_name"
            else
                read "?${prompt}" REPLY
            fi
        fi
    else
        # bash syntax (and most other shells)
        if [[ "$options" == *"-n 1 -r"* ]]; then
            # For single character input in bash
            printf "%s" "$prompt"
            if [[ -t 0 && -t 1 ]]; then
                # Both stdin and stdout are terminals, safe to read interactively
                read -n 1 -r REPLY
            else
                # Fallback: try to read from /dev/tty if available
                if [ -c /dev/tty ]; then
                    read -n 1 -r REPLY < /dev/tty
                else
                    # Last resort: default to Y for yes/no prompts
                    REPLY="Y"
                    echo -n "${REPLY} [auto-selected]"
                fi
            fi
            echo  # Add newline after single character input
        else
            # For normal input in bash
            printf "%s" "$prompt"
            if [[ -t 0 && -t 1 ]]; then
                # Both stdin and stdout are terminals
                if [ -n "$var_name" ]; then
                    read -r "$var_name"
                else
                    read -r REPLY
                fi
            else
                # Fallback to /dev/tty if available
                if [ -c /dev/tty ]; then
                    if [ -n "$var_name" ]; then
                        read -r "$var_name" < /dev/tty
                    else
                        read -r REPLY < /dev/tty
                    fi
                else
                    # Default behavior
                    if [ -n "$var_name" ]; then
                        eval "$var_name=''"
                    else
                        REPLY=""
                    fi
                    echo -n "[auto-selected]"
                fi
            fi
        fi
    fi
}

# Print colored messages with consistent formatting
print_info() {
    printf "${BLUE}%-10s${NC} %s\n" "[INFO]" "$1"
}

print_success() {
    printf "${GREEN}%-10s${NC} %s\n" "[SUCCESS]" "$1"
}

print_warning() {
    printf "${YELLOW}%-10s${NC} %s\n" "[WARNING]" "$1"
}

print_error() {
    printf "${RED}%-10s${NC} %s\n" "[ERROR]" "$1"
}

# Display banner
show_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
  ____             _               ____                      _      
 |  _ \  ___   ___| | _____ _ __  / ___|___  _ __  ___  ___ | | ___ 
 | | | |/ _ \ / __| |/ / _ \ '__|| |   / _ \| '_ \/ __|/ _ \| |/ _ \
 | |_| | (_) | (__|   <  __/ |   | |__| (_) | | | \__ \ (_) | |  __/
 |____/ \___/ \___|_|\_\___|_|    \____\___/|_| |_|___/\___/|_|\___|
                                                                    
EOF
    echo -e "${NC}"
    echo -e "${BLUE}                   🐳 Docker Console Installer 🐳${NC}"
    echo -e "${BLUE}                   Smart container management tool${NC}"
    echo
}

# Check if Docker is installed
check_docker() {
    print_info "Checking if Docker is installed..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        print_info "To install Docker, visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_info "Checking if Docker is running..."
    if ! docker info &> /dev/null; then
        print_error "Docker service is not running. Please start Docker service."
        exit 1
    fi
    
    print_success "Docker check passed"
}

# Check if image has updates
check_image_updates() {
    print_info "Checking for image updates..."
    
    # Get current running container's image digest if container exists
    local current_container_digest=""
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        # Get the image digest that the current container is using
        local container_image=$(docker inspect --format='{{.Config.Image}}' "${CONTAINER_NAME}" 2>/dev/null)
        if [ -n "$container_image" ]; then
            current_container_digest=$(docker images --digests --no-trunc --format "table {{.Repository}}:{{.Tag}}\t{{.Digest}}" | grep "^${container_image}" | awk '{print $2}')
            print_info "Current container is using image: ${container_image}"
            if [ -n "$current_container_digest" ]; then
                print_info "Current container image digest: ${current_container_digest}"
            fi
        fi
    fi
    
    # Pull latest image to check for updates
    print_info "Pulling Docker Console image (${IMAGE_TAG})..."
    if docker pull "${full_image_name}" > /dev/null 2>&1; then
        print_success "Image pull completed"
    else
        print_error "Image pull failed"
        exit 1
    fi
    
    # Get newly pulled image digest
    local new_image_digest=$(docker images --digests --no-trunc --format "table {{.Repository}}:{{.Tag}}\t{{.Digest}}" | grep "^${full_image_name}" | awk '{print $2}')
    print_info "New image digest: ${new_image_digest}"
    
    # Compare digests
    if [ -n "$current_container_digest" ] && [ "$current_container_digest" = "$new_image_digest" ]; then
        print_success "Container is already using the latest image (no update needed)"
        return 1  # No update needed
    else
        if [ -n "$current_container_digest" ]; then
            print_success "Image update detected - container needs to be restarted"
        else
            print_success "Image downloaded (no existing container or first time)"
        fi
        return 0  # Update needed
    fi
}

# Stop and remove existing container with update check
remove_existing_container() {
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        print_warning "Found existing ${CONTAINER_NAME} container."
        
        # Show container info
        echo
        echo "┌────────────────────────────────────────────────────────────────────────────┐"
        echo "│                         Existing Container Details                         │"
        echo "└────────────────────────────────────────────────────────────────────────────┘"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAMES|${CONTAINER_NAME})"
        
        echo
        
        # Check if we need to update due to image changes
        if [ "$FORCE_UPDATE" = "true" ]; then
            print_info "Image has been updated, container restart is recommended."
            read_input "Do you want to restart the container with the new image? (Y/n): " "-n 1 -r"
            echo
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                print_info "Keeping existing container running with old image."
                print_warning "To use the new image, restart the container manually later."
                exit 0
            fi
        else
            read_input "Do you want to remove the existing container? (y/N): " "-n 1 -r"
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Installation cancelled. Existing container will be kept."
                print_info "To proceed, please manually remove the container or use a different name with --name option."
                exit 0
            fi
        fi
        
        print_info "Removing existing ${CONTAINER_NAME} container..."
        docker stop "${CONTAINER_NAME}" &> /dev/null || true
        docker rm "${CONTAINER_NAME}" &> /dev/null || true
        print_success "Existing container removed"
    fi
}

# Pull latest image (now just a simple function)
pull_image() {
    # This function is now mostly handled by check_image_updates
    # But we keep it for cases where we skip the update check
    if [ "$SKIP_IMAGE_CHECK" = "true" ]; then
        print_info "Pulling Docker Console image (${IMAGE_TAG})..."
        if docker pull "${IMAGE_NAME}:${IMAGE_TAG}"; then
            print_success "Image pull completed"
        else
            print_error "Image pull failed"
            exit 1
        fi
    fi
}

# Check for port conflicts and handle them
check_port_conflict() {
    local port_in_use=false
    local conflicting_process=""
    
    # Check if port is already in use (cross-platform compatible)
    if command -v lsof &> /dev/null; then
        # Use lsof if available (works on both Mac and Linux)
        if lsof -Pi :${HOST_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
            port_in_use=true
            conflicting_process=$(lsof -Pi :${HOST_PORT} -sTCP:LISTEN -n | tail -n +2 | head -n 1)
        fi
    else
        # Fallback: try netstat without -p option (works on Mac)
        if netstat -an 2>/dev/null | grep -q ":${HOST_PORT}.*LISTEN"; then
            port_in_use=true
            conflicting_process="Unknown process (use 'lsof -i :${HOST_PORT}' to identify)"
        fi
    fi
    
    if [ "$port_in_use" = true ]; then
        print_warning "Port ${HOST_PORT} is already in use."
        print_info "Conflicting process: ${conflicting_process}"
        echo
        echo "┌────────────────────────────────────────────────────────────────────────────┐"
        echo "│                         Port Conflict Resolution                           │"
        echo "├────────────────────────────────────────────────────────────────────────────┤"
        echo "│  1) Auto-select a random available port                                    │"
        echo "│  2) Specify a different port manually                                      │"
        echo "│  3) Cancel installation                                                    │"
        echo "└────────────────────────────────────────────────────────────────────────────┘"
        echo
        read_input "Please choose an option (1-3): " "-n 1 -r"
        echo
        
        case $REPLY in
            1)
                # Find a random available port
                local new_port
                for i in {8000..9000}; do
                    if ! (command -v lsof &> /dev/null && lsof -Pi :$i -sTCP:LISTEN -t >/dev/null 2>&1) && \
                       ! (netstat -an 2>/dev/null | grep -q ":$i.*LISTEN"); then
                        new_port=$i
                        break
                    fi
                done
                
                if [ -n "$new_port" ]; then
                    HOST_PORT=$new_port
                    print_success "Selected available port: ${HOST_PORT}"
                else
                    print_error "Could not find an available port in range 8000-9000"
                    exit 1
                fi
                ;;
            2)
                # Ask user for a different port
                while true; do
                    read_input "Enter a different port number: " "" "new_port"
                    if [ -z "$new_port" ]; then
                        new_port="$REPLY"  # Fallback for shells that use REPLY
                    fi
                    if [[ "$new_port" =~ ^[0-9]+$ ]] && [ "$new_port" -gt 1023 ] && [ "$new_port" -lt 65536 ]; then
                        # Check if the new port is available
                        if ! (command -v lsof &> /dev/null && lsof -Pi :$new_port -sTCP:LISTEN -t >/dev/null 2>&1) && \
                           ! (netstat -an 2>/dev/null | grep -q ":$new_port.*LISTEN"); then
                            HOST_PORT=$new_port
                            print_success "Using port: ${HOST_PORT}"
                            break
                        else
                            print_error "Port ${new_port} is also in use. Please try another port."
                        fi
                    else
                        print_error "Invalid port number. Please enter a number between 1024-65535."
                    fi
                done
                ;;
            3)
                print_info "Installation cancelled"
                exit 0
                ;;
            *)
                print_error "Invalid option. Installation cancelled."
                exit 1
                ;;
        esac
    fi
}

# Create and start container
start_container() {
    print_info "Starting Docker Console container..."
    
    # Check for port conflicts
    check_port_conflict
    
    # Start container
    if docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart always \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "${CONFIG_DIR}:/docker-console" \
        "${IMAGE_NAME}:${IMAGE_TAG}" > /dev/null; then
        print_success "Docker Console container started successfully"
    else
        print_error "Container start failed"
        exit 1
    fi
}

# Wait for service to start
wait_for_service() {
    print_info "Waiting for service to start..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Try different methods to check if service is running
        if command -v curl &> /dev/null; then
            # Use curl if available
            if curl -s "http://localhost:${HOST_PORT}" > /dev/null 2>&1; then
                echo -e "\r\033[K${GREEN}[SUCCESS]${NC} Service is running"
                return 0
            fi
        elif command -v wget &> /dev/null; then
            # Use wget as fallback
            if wget -q --spider "http://localhost:${HOST_PORT}" 2>/dev/null; then
                echo -e "\r\033[K${GREEN}[SUCCESS]${NC} Service is running"
                return 0
            fi
        else
            # Use nc (netcat) as last resort if available
            if command -v nc &> /dev/null; then
                if nc -z localhost "${HOST_PORT}" 2>/dev/null; then
                    echo -e "\r\033[K${GREEN}[SUCCESS]${NC} Service is running"
                    return 0
                fi
            else
                # Skip service check if no tools available
                echo -e "\r\033[K${YELLOW}[WARNING]${NC} No tools available to check service status (curl, wget, or nc)"
                print_info "Please manually verify the service at http://localhost:${HOST_PORT}"
                return 0
            fi
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo
    print_warning "Service startup check timed out, but container is running"
    print_info "You can manually check service status: docker logs ${CONTAINER_NAME}"
}

# Display installation completion information
show_completion_info() {
    echo
    echo "┌────────────────────────────────────────────────────────────────────────────┐"
    echo "│                         Installation Completed Successfully                │"
    echo "├────────────────────────────────────────────────────────────────────────────┤"
    printf "│ %-32s : %-39s │\n" "Access URL" "http://localhost:${HOST_PORT}"
    printf "│ %-32s : %-39s │\n" "Container name" "${CONTAINER_NAME}"
    printf "│ %-32s : %-39s │\n" "Host config directory" "${CONFIG_DIR}"
    printf "│ %-32s : %-39s │\n" "Container config directory" "/docker-console"
    echo "├────────────────────────────────────────────────────────────────────────────┤"
    echo "│                             Management Commands                            │"
    echo "├────────────────────────────────────────────────────────────────────────────┤"
    printf "│ %-74s │\n" "Check container status:"
    printf "│   %-72s │\n" "docker ps | grep ${CONTAINER_NAME}"
    printf "│ %-74s │\n" "View container logs:"
    printf "│   %-72s │\n" "docker logs ${CONTAINER_NAME}"
    printf "│ %-74s │\n" "Stop container:"
    printf "│   %-72s │\n" "docker stop ${CONTAINER_NAME}"
    printf "│ %-74s │\n" "Start container:"
    printf "│   %-72s │\n" "docker start ${CONTAINER_NAME}"
    printf "│ %-74s │\n" "Remove container:"
    printf "│   %-72s │\n" "docker rm -f ${CONTAINER_NAME}"
    echo "└────────────────────────────────────────────────────────────────────────────┘"
    echo
}

# Main function
main() {
    show_banner
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                HOST_PORT="$2"
                shift 2
                ;;
            -n|--name)
                CONTAINER_NAME="$2"
                shift 2
                ;;
            -c|--config-dir)
                CONFIG_DIR="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo
                echo "Options:"
                echo "  -p, --port PORT        Set host port (default: 7293)"
                echo "  -n, --name NAME        Set container name (default: docker-console)"
                echo "  -c, --config-dir DIR   Set config directory (default: /docker-console)"
                echo "  -t, --tag TAG          Set image tag (default: latest)"
                echo "  -h, --help             Show this help message"
                echo
                echo "Examples:"
                echo "  $0                              # Install latest version"
                echo "  $0 --tag 1.3.5                 # Install specific version"
                echo "  $0 --port 8080 --tag 1.3.5     # Custom port and version"
                echo
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                print_info "Use --help to see available options"
                exit 1
                ;;
        esac
    done
    
    echo "┌────────────────────────────────────────────────────────────────────────────┐"
    echo "│                          Installation Configuration                        │"
    echo "├────────────────────────────────────────────────────────────────────────────┤"
    printf "│ %-32s : %-39s │\n" "Image name" "${IMAGE_NAME}"
    printf "│ %-32s : %-39s │\n" "Image tag" "${IMAGE_TAG}"
    printf "│ %-32s : %-39s │\n" "Container name" "${CONTAINER_NAME}"
    printf "│ %-32s : %-39s │\n" "Host port" "${HOST_PORT}"
    printf "│ %-32s : %-39s │\n" "Host config directory" "${CONFIG_DIR}"
    printf "│ %-32s : %-39s │\n" "Container config directory" "/docker-console"
    echo "└────────────────────────────────────────────────────────────────────────────┘"
    echo
    
    # Execute installation steps
    check_docker
    
    # Check for image updates first
    if check_image_updates; then
        # Image has updates or no existing container, need to handle existing container
        FORCE_UPDATE="true"
        remove_existing_container
        SKIP_IMAGE_CHECK="true"  # Skip pulling again since we already did it
    else
        # Container is already using the latest image, check if it's running
        if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
            print_success "Container is already running with the latest image"
            print_info "Access URL: http://localhost:${HOST_PORT}"
            print_info "Use 'docker logs ${CONTAINER_NAME}' to view logs"
            exit 0
        elif docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
            # Container exists but not running, ask to restart
            print_info "Container exists with latest image but is not running"
            read_input "Do you want to start the existing container? (Y/n): " "-n 1 -r"
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                if docker start "${CONTAINER_NAME}" > /dev/null; then
                    print_success "Container started successfully"
                    wait_for_service
                    show_completion_info
                    exit 0
                else
                    print_error "Failed to start existing container, will create a new one"
                    remove_existing_container
                fi
            else
                remove_existing_container
            fi
        fi
        SKIP_IMAGE_CHECK="true"  # Skip pulling since image is up to date
    fi
    
    start_container
    wait_for_service
    show_completion_info
}

# Run main function
main "$@" 