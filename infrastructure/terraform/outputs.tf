# ============================================================
# InboxOS — Terraform Outputs
# Connection strings and resource identifiers for the app tier.
# ============================================================

# ---- VPC ----

output "vpc_id" {
  description = "ID of the InboxOS VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (for ECS/EC2 task placement)"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (for ALB / NAT Gateway)"
  value       = aws_subnet.public[*].id
}

# ---- Security Groups ----

output "app_security_group_id" {
  description = "Security group ID for the application tier"
  value       = aws_security_group.app.id
}

output "rds_security_group_id" {
  description = "Security group ID for the RDS instance"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for the ElastiCache Redis cluster"
  value       = aws_security_group.redis.id
}

# ---- RDS PostgreSQL ----

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL hostname"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "database_url" {
  description = "Full PostgreSQL connection string for the application (DATABASE_URL)"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}?sslmode=require"
  sensitive   = true
}

# ---- ElastiCache Redis ----

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = 6379
}

output "redis_url" {
  description = "Full Redis connection string for the application (REDIS_URL)"
  value       = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
  sensitive   = true
}

