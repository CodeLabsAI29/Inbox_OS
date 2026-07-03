# ============================================================
# InboxOS — ElastiCache Redis (Private Subnet, Encrypted)
# Uses a Replication Group for encryption + automatic failover.
# ============================================================

# ---- ElastiCache Subnet Group (private subnets only) ----

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Private subnet group for InboxOS ElastiCache Redis"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# ---- ElastiCache Parameter Group ----

resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-${var.environment}-redis71-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis71-params"
  }
}

# ---- ElastiCache Redis Replication Group ----
# Using a replication group instead of a standalone cluster enables
# encryption at rest, encryption in transit, and automatic failover.

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "InboxOS Redis replication group with encryption"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_nodes
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # Networking — private subnets, no public access
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # High Availability
  automatic_failover_enabled = var.redis_num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.redis_num_cache_nodes > 1 ? true : false

  # Maintenance & Snapshots
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 3
  snapshot_window          = "02:00-03:00"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}
