#!/bin/bash

# 1. Point Docker CLI to Minikube's Docker daemon
# This ensures the images are built INSIDE Minikube, so it can find them.
eval $(minikube docker-env)

echo "🐳 Building images inside Minikube..."

# 2. Build each service with the tag expected by k8s manifests
docker build -t auth-service:latest ./services/auth-service
docker build -t campaign-service:latest ./services/campaign-service
docker build -t assessment-service:latest ./services/assessment-service
docker build -t student-service:latest ./services/student-service
docker build -t dashboard-service:latest ./services/dashboard-service
docker build -t gateway:latest ./services/gateway
docker build -t client:latest ./client

echo "✅ All images built! Restarting pods..."

# 3. Delete pods to force them to restart and pick up the new images
kubectl delete pods --all

echo "🚀 Pods restarted. Run 'kubectl get pods' to check status."
