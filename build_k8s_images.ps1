# PowerShell script to build images inside Minikube

# 1. Point Docker CLI to Minikube's Docker daemon
Write-Host "🐳 Setting up Minikube Docker Environment..."
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to set up Minikube environment. Is Minikube running?"
    exit 1
}

Write-Host "🐳 Building images inside Minikube..."

# 2. Build each service with the tag expected by k8s manifests
docker build -t local/auth-service:latest ./services/auth-service
docker build -t local/campaign-service:latest ./services/campaign-service
docker build -t local/assessment-service:latest ./services/assessment-service
docker build -t local/student-service:latest ./services/student-service
docker build -t local/dashboard-service:latest ./services/dashboard-service
docker build -t local/gateway:latest ./services/gateway
docker build -t local/client:latest ./client

Write-Host "✅ All images built! Restarting pods..."

# 3. Delete pods to force them to restart and pick up the new images
kubectl delete pods --all

Write-Host "🚀 Pods restarted. Run 'kubectl get pods' to check status."
