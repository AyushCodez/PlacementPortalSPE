# PowerShell script to deploy to local Kubernetes
Write-Host "🚀 Deploying to local Kubernetes..."

if (-not (Test-Path "k8s-local")) {
    Write-Error "❌ Error: k8s-local directory not found!"
    exit 1
}

# Apply MongoDB
kubectl apply -f k8s-local/mongo-pvc.yaml
kubectl apply -f k8s-local/mongo.yaml

# Apply Backend Services
kubectl apply -f k8s-local/secrets.yaml
kubectl apply -f k8s-local/backend.yaml

# Apply Gateway
kubectl apply -f k8s-local/gateway.yaml

# Apply Client
kubectl apply -f k8s-local/client.yaml

# Run Seed Job
kubectl delete job seed-job --ignore-not-found=$true
kubectl apply -f k8s-local/seed-job.yaml

Write-Host "✨ Deployment applied successfully!"
