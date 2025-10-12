# Domain-Driven Microservices Project

A comprehensive domain-driven microservices architecture built with Node.js, Angular, and modern DevOps practices.

## 🏗️ Architecture Overview

This project implements a domain-driven microservices architecture with the following components:

### Backend Services
- **Calendar Service** - Event and reminder management
- **Objectives & Goals Service** - Goal tracking and progress monitoring
- **Technology Updates Service** - Article and content management
- **API Gateway** - Centralized API routing and authentication

### Frontend
- **Angular v20** - Modern single-page application with Material Design
- **Responsive Design** - Mobile-first approach with progressive enhancement

### Infrastructure
- **MongoDB** - Document database for each domain
- **Redis** - Caching and session management
- **Apache Kafka** - Event streaming and message queuing
- **Docker** - Containerization and orchestration

### Observability
- **Prometheus** - Metrics collection and monitoring
- **Grafana** - Visualization and dashboards
- **Jaeger** - Distributed tracing
- **Winston** - Structured logging

## 🚀 Quick Start

### Prerequisites
- Node.js v22.20.0 or higher
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd domain-driven-microservices
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development environment**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - API Gateway: http://localhost:3000
   - Calendar Service: http://localhost:3001
   - Objectives Service: http://localhost:3002
   - Tech Updates Service: http://localhost:3003
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3004 (admin/admin)
   - Jaeger: http://localhost:16686

## 📁 Project Structure

```
domain-driven-microservices/
├── services/
│   ├── calendar-service/          # Calendar domain microservice
│   ├── objectives-service/        # Objectives domain microservice
│   └── tech-updates-service/     # Technology updates domain microservice
├── frontend/                      # Angular frontend application
├── monitoring/                    # Observability configuration
├── .github/workflows/             # CI/CD pipeline
├── docker-compose.yml             # Development environment
└── README.md                      # This file
```

## 🔧 Development

### Backend Services

Each microservice follows the same structure:

```
service/
├── src/
│   ├── controllers/              # Request handlers
│   ├── models/                   # Database models
│   ├── services/                 # Business logic
│   ├── middleware/               # Express middleware
│   ├── routes/                   # API routes
│   ├── utils/                    # Utility functions
│   └── config/                   # Configuration
├── tests/                        # Test files
├── Dockerfile                    # Container configuration
└── package.json                  # Dependencies and scripts
```

### Frontend

The Angular frontend is organized into feature modules:

```
frontend/src/
├── app/
│   ├── core/                     # Core services and guards
│   ├── shared/                   # Shared components and services
│   ├── features/                 # Feature modules
│   │   ├── calendar/             # Calendar feature
│   │   ├── objectives/           # Objectives feature
│   │   └── tech-updates/         # Tech updates feature
│   └── app.component.*           # Root component
├── assets/                       # Static assets
└── environments/                 # Environment configurations
```

## 🐳 Docker

### Development Environment

Start all services with Docker Compose:

```bash
docker-compose up -d
```

### Production Deployment

Build and deploy with Docker:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

### Backend Services

```bash
# Run tests for all services
npm test

# Run tests for specific service
cd services/calendar-service
npm test

# Run tests with coverage
npm run test:coverage
```

### Frontend

```bash
# Run unit tests
cd frontend
npm test

# Run e2e tests
npm run e2e
```

## 📊 Monitoring

### Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3004 (admin/admin)

### Tracing
- **Jaeger**: http://localhost:16686

### Logs
- Structured JSON logs with Winston
- Centralized logging with ELK stack (optional)

## 🔐 Security

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- OAuth2 integration ready

### Security Features
- Helmet.js for security headers
- Rate limiting
- Input validation with Joi
- CORS configuration
- SQL injection prevention

## 🚀 Deployment

### CI/CD Pipeline

The project includes a comprehensive CI/CD pipeline:

1. **Lint and Format Check**
2. **Unit Tests**
3. **Integration Tests**
4. **Security Scanning**
5. **Docker Build**
6. **Deployment to Staging/Production

### Environment Variables

Create `.env` files for each environment:

```bash
# .env.development
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-secret-key
```

## 📚 API Documentation

### Calendar Service
- **Base URL**: http://localhost:3001
- **Endpoints**:
  - `GET /api/calendar/events` - Get events
  - `POST /api/calendar/events` - Create event
  - `PUT /api/calendar/events/:id` - Update event
  - `DELETE /api/calendar/events/:id` - Delete event

### Objectives Service
- **Base URL**: http://localhost:3002
- **Endpoints**:
  - `GET /api/objectives` - Get objectives
  - `POST /api/objectives` - Create objective
  - `PUT /api/objectives/:id` - Update objective
  - `DELETE /api/objectives/:id` - Delete objective

### Technology Updates Service
- **Base URL**: http://localhost:3003
- **Endpoints**:
  - `GET /api/articles` - Get articles
  - `POST /api/articles` - Create article
  - `PUT /api/articles/:id` - Update article
  - `DELETE /api/articles/:id` - Delete article
  - `GET /api/articles/trending` - Get trending articles
  - `GET /api/articles/latest` - Get latest articles
  - `GET /api/articles/categories` - Get categories
  - `GET /api/articles/tags` - Get tags

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added observability and monitoring
- **v1.2.0** - Enhanced security and performance
