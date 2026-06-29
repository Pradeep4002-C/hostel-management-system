# Security Policy

Do not open public issues containing credentials, tokens, database URLs, personal data, or uploaded complaint images. Report suspected vulnerabilities privately to the repository owner and rotate any potentially exposed secret immediately.

Production deployments must use HTTPS, a unique access-token secret of at least 32 characters, an explicit `CORS_ORIGIN`, a private MongoDB user with least-privilege access, and configured Cloudinary credentials. Never commit `.env` files.
