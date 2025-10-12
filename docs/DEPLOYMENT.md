# Deployment Guide

This guide covers the deployment of the Domain-Driven Microservices project in various environments.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js v22.20.0 or higher
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd domain-driven-microservices
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```

4. **Access the application**
   - API Gateway: http://localhost:3000
   - Calendar Service: http://localhost:3001
   - Objectives Service: http://localhost:3002
   - Tech Updates Service: http://localhost:3003
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3004 (admin/admin)
   - Jaeger: http://localhost:16686

## 🐳 Docker Deployment

### Development Environment

The development environment uses Docker Compose with the following services:

```yaml
services:
  - api-gateway (Port 3000)
  - calendar-service (Port 3001)
  - objectives-service (Port 3002)
  - tech-updates-service (Port 3003)
  - mongodb (Port 27017)
  - redis (Port 6379)
  - kafka (Port 9092)
  - prometheus (Port 9090)
  - grafana (Port 3004)
  - jaeger (Port 16686)
```

### Production Environment

For production deployment, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Create environment files for different environments:

#### Development (.env.development)
```bash
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:9092
JWT_SECRET=your-development-secret
CORS_ORIGIN=http://localhost:4200
```

#### Production (.env.production)
```bash
NODE_ENV=production
MONGODB_URI=mongodb://production-mongo:27017
REDIS_URL=redis://production-redis:6379
KAFKA_BROKERS=production-kafka:9092
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://your-domain.com
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Helm (optional)

### Namespace Setup

```bash
kubectl create namespace domain-driven-microservices
kubectl config set-context --current --namespace=domain-driven-microservices
```

### ConfigMaps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  MONGODB_URI: "mongodb://mongodb:27017"
  REDIS_URL: "redis://redis:6379"
  KAFKA_BROKERS: "kafka:9092"
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  MONGODB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
```

### Deployments

#### Calendar Service
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calendar-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: calendar-service
  template:
    metadata:
      labels:
        app: calendar-service
    spec:
      containers:
      - name: calendar-service
        image: your-registry/calendar-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: calendar-service
spec:
  selector:
    app: calendar-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: domain-driven-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 4200
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

## 🔧 Configuration Management

### Environment-Specific Configs

#### Development
```typescript
export const config = {
  port: 3000,
  nodeEnv: 'development',
  mongodb: {
    uri: 'mongodb://localhost:27017/calendar_db',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  kafka: {
    brokers: ['localhost:9092'],
  },
  jwt: {
    secret: 'development-secret',
    expiresIn: '24h',
  },
};
```

#### Production
```typescript
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: 'production',
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS.split(','),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h',
  },
};
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'microservices'
    static_configs:
      - targets: ['calendar-service:3001', 'objectives-service:3002', 'tech-updates-service:3003']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboards

Import the following dashboards:
- Microservices Overview
- Service Performance
- Database Metrics
- Kafka Metrics

### Jaeger Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-config
data:
  JAEGER_AGENT_HOST: "jaeger-agent"
  JAEGER_AGENT_PORT: "6831"
  JAEGER_SAMPLER_TYPE: "const"
  JAEGER_SAMPLER_PARAM: "1"
```

## 🔐 Security Configuration

### SSL/TLS Setup

#### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://frontend:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://api-gateway:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Security

#### MongoDB Authentication
```javascript
// Enable authentication
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
});

// Create application user
use calendar_db
db.createUser({
  user: "calendar-user",
  pwd: "calendar-password",
  roles: ["readWrite"]
});
```

#### Redis Authentication
```bash
# redis.conf
requirepass your-redis-password
```

## 🚀 CI/CD Pipeline

### GitHub Actions

The project includes a comprehensive CI/CD pipeline:

1. **Code Quality**
   - ESLint and Prettier checks
   - TypeScript compilation
   - Security scanning

2. **Testing**
   - Unit tests for all services
   - Integration tests
   - E2E tests for frontend

3. **Build**
   - Docker image creation
   - Multi-stage builds for optimization

4. **Deploy**
   - Staging deployment on develop branch
   - Production deployment on main branch

### Deployment Scripts

#### Deploy to Staging
```bash
#!/bin/bash
# deploy-staging.sh

echo "Deploying to staging..."

# Build and push images
docker build -t your-registry/calendar-service:staging ./services/calendar-service
docker push your-registry/calendar-service:staging

# Deploy to staging
kubectl apply -f k8s/staging/
kubectl rollout restart deployment/calendar-service -n staging
```

#### Deploy to Production
```bash
#!/bin/bash
# deploy-production.sh

echo "Deploying to production..."

# Build and push images
docker build -t your-registry/calendar-service:latest ./services/calendar-service
docker push your-registry/calendar-service:latest

# Deploy to production
kubectl apply -f k8s/production/
kubectl rollout restart deployment/calendar-service -n production
```

## 🔄 Database Migrations

### MongoDB Migrations

```javascript
// migrations/001-initial-schema.js
db.createCollection("events");
db.createCollection("reminders");
db.createCollection("recurring_patterns");

// Create indexes
db.events.createIndex({ userId: 1, startDate: 1 });
db.reminders.createIndex({ userId: 1, reminderTime: 1 });
```

### Migration Script

```bash
#!/bin/bash
# migrate.sh

echo "Running database migrations..."

# Connect to MongoDB and run migrations
mongosh --host $MONGODB_HOST --port $MONGODB_PORT --username $MONGODB_USER --password $MONGODB_PASSWORD --authenticationDatabase admin < migrations/001-initial-schema.js

echo "Migrations completed."
```

## 📈 Performance Optimization

### Resource Limits

#### Kubernetes Resources
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

#### Docker Resources
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Scaling Configuration

#### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: calendar-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: calendar-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🛠️ Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check service logs
docker-compose logs calendar-service

# Check service status
docker-compose ps

# Restart service
docker-compose restart calendar-service
```

#### Database Connection Issues
```bash
# Check MongoDB connection
mongosh --host localhost --port 27017

# Check Redis connection
redis-cli -h localhost -p 6379 ping
```

#### Kafka Issues
```bash
# Check Kafka topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check Kafka logs
docker-compose logs kafka
```

### Health Checks

#### Service Health
```bash
# Check all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

#### Database Health
```bash
# MongoDB health
mongosh --eval "db.adminCommand('ping')"

# Redis health
redis-cli ping
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
