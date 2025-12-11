# Placement Test Management System

This project consists of a React client and a Node.js/Express server.

## Prerequisites

- Node.js installed on your machine.
- MongoDB installed and running (or a cloud MongoDB URI).

## Setup and Run

### 1. Server Setup

Navigate to the `server` directory, install dependencies, and start the server.

```bash
cd server
npm install
npm start
```

The server will typically run on a port defined in the `.env` file (e.g., 5000 or 8000).

### 2. Client Setup

Open a new terminal, navigate to the `client` directory, install dependencies, and start the client.

```bash
cd client
npm install
npm start
```

The client will run on `http://localhost:3000` by default.

## Configuration

Both `client` and `server` directories contain `.env` files. Ensure these are properly configured with necessary environment variables (e.g., Database URI, Port, API keys).


```
bash
minikube service client --url
```

```
bash
ansible-playbook -i inventory.ini deploy.yml
```