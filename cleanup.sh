#!/bin/bash

echo "🛑 Stopping background port-forwarding..."
# Kill any process that matches "kubectl" and "port-forward"
if pkill -f "kubectl.*port-forward"; then
    echo "✅ Port-forwarding stopped."
else
    echo "⚠️ No port-forwarding processes found."
fi

echo "🛑 Stopping Minikube cluster..."
minikube stop

echo "✅ Cleanup complete. The application is stopped."
