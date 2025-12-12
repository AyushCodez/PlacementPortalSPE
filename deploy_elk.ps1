# PowerShell script to deploy ELK Stack

Write-Host "🦌 Deploying ELK Stack (Elasticsearch, Logstash, Kibana)..."

if (-not (Test-Path "k8s-local\elk")) {
    Write-Error "❌ Error: k8s-local\elk directory not found!"
    exit 1
}

# Apply Namespace
Write-Host "📦 Creating 'logging' namespace..."
kubectl apply -f k8s-local/elk/00-namespace.yaml

# Apply Elasticsearch
Write-Host "🧠 Deploying Elasticsearch..."
kubectl apply -f k8s-local/elk/01-elasticsearch.yaml

# Apply Logstash
Write-Host "🪵 Deploying Logstash..."
kubectl apply -f k8s-local/elk/02-logstash.yaml

# Apply Kibana
Write-Host "📊 Deploying Kibana..."
kubectl apply -f k8s-local/elk/03-kibana.yaml

# Apply Filebeat
Write-Host "🕵️ Deploying Filebeat..."
kubectl apply -f k8s-local/elk/04-filebeat.yaml

Write-Host "⏳ Waiting for ELK pods to be ready (this may take a few minutes)..."
Write-Host "   Run: kubectl get pods -n logging -w"
Write-Host "✨ ELK Deployment applied!"
Write-Host "   Access Kibana at: http://localhost:30001 (if using minikube tunnel) or via 'minikube service kibana -n logging'"
