# ============================================================
# InboxOS — Production Variable Values
# Supply db_username and db_password via environment variables:
#   export TF_VAR_db_username="your_admin_user"
#   export TF_VAR_db_password="your_secure_password_16_chars"
# ============================================================

aws_region  = "us-east-1"
environment = "production"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# RDS PostgreSQL
db_instance_class        = "db.t3.medium"
db_allocated_storage     = 50
db_max_allocated_storage = 200
db_name                  = "inboxos"

# ElastiCache Redis
redis_node_type       = "cache.t3.medium"
redis_num_cache_nodes = 1
redis_engine_version  = "7.1"
