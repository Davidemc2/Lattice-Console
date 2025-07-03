// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    os: String,
    arch: String,
    docker_installed: bool,
    docker_running: bool,
    cpu_cores: u32,
    total_memory: u64,
    available_memory: u64,
    disk_space: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerInstallProgress {
    step: String,
    progress: u8,
    message: String,
    success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AgentConfig {
    backend_url: String,
    agent_name: String,
    compute_hours: String,
    auto_start: bool,
    gpu_enabled: bool,
}

type AppState = Mutex<HashMap<String, String>>;

#[command]
async fn check_system_requirements() -> Result<SystemInfo, String> {
    // Get OS info
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    
    // Check Docker installation
    let docker_installed = check_docker_installed();
    let docker_running = if docker_installed { check_docker_running() } else { false };
    
    // Get system resources
    let cpu_cores = num_cpus::get() as u32;
    let (total_memory, available_memory) = get_memory_info();
    let disk_space = get_disk_space();

    Ok(SystemInfo {
        os,
        arch,
        docker_installed,
        docker_running,
        cpu_cores,
        total_memory,
        available_memory,
        disk_space,
    })
}

#[command]
async fn install_docker(state: State<'_, AppState>) -> Result<Vec<DockerInstallProgress>, String> {
    let mut progress = Vec::new();
    
    progress.push(DockerInstallProgress {
        step: "preparing".to_string(),
        progress: 10,
        message: "Preparing Docker installation...".to_string(),
        success: true,
    });

    let os = std::env::consts::OS;
    
    match os {
        "windows" => install_docker_windows(&mut progress).await,
        "macos" => install_docker_macos(&mut progress).await,
        "linux" => install_docker_linux(&mut progress).await,
        _ => Err(format!("Unsupported OS: {}", os)),
    }
}

#[command]
async fn setup_agent(config: AgentConfig, state: State<'_, AppState>) -> Result<String, String> {
    // Create agent configuration
    let agent_config = create_agent_config(&config)?;
    
    // Download and setup agent
    download_agent().await?;
    
    // Start agent service
    start_agent_service(&agent_config)?;
    
    // Setup auto-start if requested
    if config.auto_start {
        setup_auto_start()?;
    }
    
    // Prevent system sleep during compute hours
    if !config.compute_hours.is_empty() {
        setup_caffeine_schedule(&config.compute_hours)?;
    }
    
    Ok("Agent setup completed successfully".to_string())
}

#[command]
async fn test_connection(backend_url: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    match client.get(&format!("{}/health", backend_url)).send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(e) => Err(format!("Connection failed: {}", e)),
    }
}

#[command]
async fn get_agent_status() -> Result<HashMap<String, String>, String> {
    let mut status = HashMap::new();
    
    // Check if agent is running
    let agent_running = check_agent_running();
    status.insert("running".to_string(), agent_running.to_string());
    
    // Get resource usage
    let (cpu_usage, memory_usage) = get_resource_usage();
    status.insert("cpu_usage".to_string(), cpu_usage.to_string());
    status.insert("memory_usage".to_string(), memory_usage.to_string());
    
    // Check Docker containers
    let containers = get_running_containers();
    status.insert("containers".to_string(), containers.len().to_string());
    
    Ok(status)
}

#[command]
async fn configure_cluster(gpu_config: Vec<String>) -> Result<String, String> {
    // Configure multi-GPU or multi-node cluster
    for gpu in gpu_config {
        setup_gpu_support(&gpu)?;
    }
    
    Ok("Cluster configuration completed".to_string())
}

#[command]
async fn cleanup_agent() -> Result<String, String> {
    // Stop agent service
    stop_agent_service()?;
    
    // Remove agent files
    remove_agent_files()?;
    
    // Remove auto-start configuration
    remove_auto_start()?;
    
    // Remove caffeine schedule
    remove_caffeine_schedule()?;
    
    Ok("Agent cleanup completed".to_string())
}

// Helper functions
fn check_docker_installed() -> bool {
    Command::new("docker")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn check_docker_running() -> bool {
    Command::new("docker")
        .arg("info")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn get_memory_info() -> (u64, u64) {
    // Platform-specific memory info
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        let meminfo = fs::read_to_string("/proc/meminfo").unwrap_or_default();
        // Parse meminfo for total and available memory
        (8_000_000_000, 4_000_000_000) // Placeholder
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        (8_000_000_000, 4_000_000_000) // Placeholder
    }
}

fn get_disk_space() -> u64 {
    // Platform-specific disk space check
    100_000_000_000 // Placeholder: 100GB
}

async fn install_docker_windows(progress: &mut Vec<DockerInstallProgress>) -> Result<Vec<DockerInstallProgress>, String> {
    progress.push(DockerInstallProgress {
        step: "downloading".to_string(),
        progress: 30,
        message: "Downloading Docker Desktop for Windows...".to_string(),
        success: true,
    });
    
    // Download Docker Desktop installer
    let url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe";
    download_file(url, "DockerDesktopInstaller.exe").await?;
    
    progress.push(DockerInstallProgress {
        step: "installing".to_string(),
        progress: 70,
        message: "Installing Docker Desktop...".to_string(),
        success: true,
    });
    
    // Run installer
    let output = Command::new("DockerDesktopInstaller.exe")
        .arg("install")
        .arg("--quiet")
        .output()
        .map_err(|e| format!("Failed to run installer: {}", e))?;
    
    if !output.status.success() {
        return Err("Docker installation failed".to_string());
    }
    
    progress.push(DockerInstallProgress {
        step: "completed".to_string(),
        progress: 100,
        message: "Docker installation completed successfully".to_string(),
        success: true,
    });
    
    Ok(progress.clone())
}

async fn install_docker_macos(progress: &mut Vec<DockerInstallProgress>) -> Result<Vec<DockerInstallProgress>, String> {
    progress.push(DockerInstallProgress {
        step: "downloading".to_string(),
        progress: 30,
        message: "Downloading Docker Desktop for macOS...".to_string(),
        success: true,
    });
    
    // Download Docker Desktop for macOS
    let url = if std::env::consts::ARCH == "aarch64" {
        "https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    } else {
        "https://desktop.docker.com/mac/main/amd64/Docker.dmg"
    };
    
    download_file(url, "Docker.dmg").await?;
    
    progress.push(DockerInstallProgress {
        step: "installing".to_string(),
        progress: 70,
        message: "Installing Docker Desktop...".to_string(),
        success: true,
    });
    
    // Mount DMG and install
    Command::new("hdiutil")
        .args(&["attach", "Docker.dmg"])
        .output()
        .map_err(|e| format!("Failed to mount DMG: {}", e))?;
    
    Command::new("cp")
        .args(&["-R", "/Volumes/Docker/Docker.app", "/Applications/"])
        .output()
        .map_err(|e| format!("Failed to copy app: {}", e))?;
    
    progress.push(DockerInstallProgress {
        step: "completed".to_string(),
        progress: 100,
        message: "Docker installation completed successfully".to_string(),
        success: true,
    });
    
    Ok(progress.clone())
}

async fn install_docker_linux(progress: &mut Vec<DockerInstallProgress>) -> Result<Vec<DockerInstallProgress>, String> {
    progress.push(DockerInstallProgress {
        step: "updating".to_string(),
        progress: 20,
        message: "Updating package repositories...".to_string(),
        success: true,
    });
    
    // Update package repositories
    let output = Command::new("sudo")
        .args(&["apt", "update"])
        .output()
        .map_err(|e| format!("Failed to update packages: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to update package repositories".to_string());
    }
    
    progress.push(DockerInstallProgress {
        step: "installing".to_string(),
        progress: 70,
        message: "Installing Docker Engine...".to_string(),
        success: true,
    });
    
    // Install Docker
    let output = Command::new("sudo")
        .args(&["apt", "install", "-y", "docker.io", "docker-compose"])
        .output()
        .map_err(|e| format!("Failed to install Docker: {}", e))?;
    
    if !output.status.success() {
        return Err("Docker installation failed".to_string());
    }
    
    // Add user to docker group
    let username = whoami::username();
    Command::new("sudo")
        .args(&["usermod", "-aG", "docker", &username])
        .output()
        .ok();
    
    progress.push(DockerInstallProgress {
        step: "completed".to_string(),
        progress: 100,
        message: "Docker installation completed successfully".to_string(),
        success: true,
    });
    
    Ok(progress.clone())
}

async fn download_file(url: &str, filename: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client.get(url).send().await
        .map_err(|e| format!("Failed to download: {}", e))?;
    
    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    std::fs::write(filename, bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

fn create_agent_config(config: &AgentConfig) -> Result<String, String> {
    let agent_config = format!(
        r#"
BACKEND_URL={}
AGENT_NAME={}
COMPUTE_HOURS={}
AUTO_START={}
GPU_ENABLED={}
"#,
        config.backend_url,
        config.agent_name,
        config.compute_hours,
        config.auto_start,
        config.gpu_enabled
    );
    
    Ok(agent_config)
}

async fn download_agent() -> Result<(), String> {
    // Download the latest agent binary
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let binary_name = format!("lattice-agent-{}-{}", os, arch);
    let url = format!("https://github.com/lattice-console/releases/latest/download/{}", binary_name);
    
    download_file(&url, "lattice-agent").await?;
    
    // Make executable on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata("lattice-agent")
            .map_err(|e| format!("Failed to get file metadata: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions("lattice-agent", perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }
    
    Ok(())
}

fn start_agent_service(config: &str) -> Result<(), String> {
    // Write config file
    std::fs::write(".lattice-agent.env", config)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    
    // Start agent
    Command::new("./lattice-agent")
        .arg("start")
        .spawn()
        .map_err(|e| format!("Failed to start agent: {}", e))?;
    
    Ok(())
}

fn setup_auto_start() -> Result<(), String> {
    let os = std::env::consts::OS;
    
    match os {
        "windows" => setup_windows_service(),
        "macos" => setup_macos_launchd(),
        "linux" => setup_linux_systemd(),
        _ => Err(format!("Auto-start not supported on {}", os)),
    }
}

fn setup_windows_service() -> Result<(), String> {
    // Create Windows service
    let service_definition = r#"
[Unit]
Description=Lattice Console Agent
After=docker.service

[Service]
ExecStart=/path/to/lattice-agent start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"#;
    
    // This would require Windows service APIs
    Ok(())
}

fn setup_macos_launchd() -> Result<(), String> {
    // Create LaunchDaemon plist
    let plist_content = r#"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lattice-console.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/lattice-agent</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
"#;
    
    std::fs::write("/Library/LaunchDaemons/com.lattice-console.agent.plist", plist_content)
        .map_err(|e| format!("Failed to create plist: {}", e))?;
    
    Command::new("sudo")
        .args(&["launchctl", "load", "/Library/LaunchDaemons/com.lattice-console.agent.plist"])
        .output()
        .map_err(|e| format!("Failed to load service: {}", e))?;
    
    Ok(())
}

fn setup_linux_systemd() -> Result<(), String> {
    let service_content = r#"
[Unit]
Description=Lattice Console Agent
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/lattice-agent start
Restart=always
RestartSec=10
User=lattice
Group=docker

[Install]
WantedBy=multi-user.target
"#;
    
    std::fs::write("/etc/systemd/system/lattice-agent.service", service_content)
        .map_err(|e| format!("Failed to create service file: {}", e))?;
    
    Command::new("sudo")
        .args(&["systemctl", "enable", "lattice-agent.service"])
        .output()
        .map_err(|e| format!("Failed to enable service: {}", e))?;
    
    Command::new("sudo")
        .args(&["systemctl", "start", "lattice-agent.service"])
        .output()
        .map_err(|e| format!("Failed to start service: {}", e))?;
    
    Ok(())
}

fn setup_caffeine_schedule(schedule: &str) -> Result<(), String> {
    // Setup system to prevent sleep during compute hours
    // This would be platform-specific implementation
    Ok(())
}

fn check_agent_running() -> bool {
    // Check if agent process is running
    Command::new("pgrep")
        .arg("lattice-agent")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn get_resource_usage() -> (f64, f64) {
    // Get current CPU and memory usage
    (25.5, 60.2) // Placeholder values
}

fn get_running_containers() -> Vec<String> {
    // Get list of running Docker containers
    vec!["postgres".to_string(), "minio".to_string()] // Placeholder
}

fn setup_gpu_support(gpu: &str) -> Result<(), String> {
    // Configure GPU support for the specified GPU
    Ok(())
}

fn stop_agent_service() -> Result<(), String> {
    Command::new("pkill")
        .arg("lattice-agent")
        .output()
        .map_err(|e| format!("Failed to stop agent: {}", e))?;
    
    Ok(())
}

fn remove_agent_files() -> Result<(), String> {
    std::fs::remove_file("lattice-agent").ok();
    std::fs::remove_file(".lattice-agent.env").ok();
    Ok(())
}

fn remove_auto_start() -> Result<(), String> {
    let os = std::env::consts::OS;
    
    match os {
        "linux" => {
            Command::new("sudo")
                .args(&["systemctl", "disable", "lattice-agent.service"])
                .output()
                .ok();
            std::fs::remove_file("/etc/systemd/system/lattice-agent.service").ok();
        }
        "macos" => {
            Command::new("sudo")
                .args(&["launchctl", "unload", "/Library/LaunchDaemons/com.lattice-console.agent.plist"])
                .output()
                .ok();
            std::fs::remove_file("/Library/LaunchDaemons/com.lattice-console.agent.plist").ok();
        }
        _ => {}
    }
    
    Ok(())
}

fn remove_caffeine_schedule() -> Result<(), String> {
    // Remove caffeine schedule
    Ok(())
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            check_system_requirements,
            install_docker,
            setup_agent,
            test_connection,
            get_agent_status,
            configure_cluster,
            cleanup_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}