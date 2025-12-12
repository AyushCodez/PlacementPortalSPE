# Placement Test Management System (Microservices)

A comprehensive Placement Test Management System built with a Microservices architecture, deployed on Kubernetes (Minikube), and monitored using the ELK Stack.

## 🏗 Architecture

- **Frontend**: React.js
- **Backend**: Node.js Microservices (Auth, Campaign, Assessment, Student, Dashboard, Gateway)
- **Database**: MongoDB
- **Orchestration**: Kubernetes (Minikube)
- **Infrastructure as Code**: Ansible
- **CI/CD**: Jenkins
- **Monitoring**: ELK Stack (Elasticsearch, Logstash, Kibana) & Prometheus Metrics

## 🚀 Prerequisites

Ensure you have the following installed:
- **Docker Desktop** (with WSL2 backend on Windows)
- **Minikube**
- **Ansible**
- **kubectl**

## 🛠 Deployment Guide

### Option 1: Automated Deployment via Ansible (Recommended)

You can deploy the entire stack (App + DB + ELK) locally using the provided Ansible playbook.

1.  **Configure Secrets**:
    Ensure you have your secrets configured in `group_vars/all/vault.yml`.
    ```bash
    # If you have the vault password
    ansible-vault edit group_vars/all/vault.yml
    ```

2.  **Run the Playbook**:
    ```bash
    ansible-playbook -i inventory.ini deploy.yml --ask-vault-pass --extra-vars "docker_user=<your-dockerhub-username>"
    ```
    *Note: If running via Jenkins, the vault password and variables are handled automatically.*

3.  **Port Forwarding**:
    The playbook or Jenkins pipeline sets up port forwarding. If running manually, you may need to run:
    ```bash
    kubectl port-forward svc/client 3000:3000 &
    kubectl port-forward svc/gateway 5000:5000 &
    kubectl port-forward svc/kibana 5601:5601 -n logging &
    ```

### Option 2: Jenkins CI/CD

The project includes a `Jenkinsfile` for a complete CI/CD pipeline that:
1.  Builds and pushes Docker images.
2.  Deploys infrastructure using Ansible.
3.  Sets up port forwarding.
4.  Sends email notifications on status.

## 🌐 Accessing the Application

Once deployed, the services are accessible at the following URLs:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend (Client)** | [http://localhost:3000](http://localhost:3000) | Main User Interface |
| **API Gateway** | [http://localhost:5000](http://localhost:5000) | Entry point for all backend services |
| **Kibana Dashboard** | [http://localhost:5601](http://localhost:5601) | Log monitoring and visualization |

## 📊 Monitoring (ELK Stack)

The application logs are aggregated using the ELK stack.
1.  Navigate to **Kibana**: [http://localhost:5601](http://localhost:5601)
2.  Go to **Management > Stack Management > Kibana > Index Patterns**.
3.  Create an index pattern (e.g., `logstash-*` or `filebeat-*`).
4.  Go to **Discover** to view real-time logs from all microservices.

## 🛑 Cleanup

To stop the application and free up resources, run the cleanup script:

```bash
./cleanup.sh
```
Or manually:
```bash
pkill -f "kubectl.*port-forward"
minikube stop
```

## 📂 Project Structure

```
├── client/                 # React Frontend
├── server/                 # Legacy Monolith Backend
├── services/               # Microservices (Auth, Campaign, etc.)
├── k8s/                    # Kubernetes Manifests (App)
├── k8s-local/elk/          # Kubernetes Manifests (ELK Stack)
├── roles/                  # Ansible Roles
├── deploy.yml              # Main Ansible Playbook
├── Jenkinsfile             # CI/CD Pipeline Definition
└── inventory.ini           # Ansible Inventory
```
