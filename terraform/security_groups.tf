# ============================================================
# InboxOS — Security Groups
# Principle of least privilege: DB is only accessible from the
# application security group, never from the public internet.
# ============================================================

# ---- Application Security Group ----
# This is the security group that your ECS tasks / EC2 instances
# running the InboxOS backend will belong to.

resource "aws_security_group" "app" {
  name        = "${var.project_name}-${var.environment}-app-sg"
  description = "Security group for the InboxOS application tier"
  vpc_id      = aws_vpc.main.id

  # Allow all outbound traffic (app needs to reach RDS, Redis, internet)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-sg"
  }
}

# ---- RDS (PostgreSQL) Security Group ----

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for InboxOS RDS PostgreSQL — only accessible from app tier"
  vpc_id      = aws_vpc.main.id

  # Inbound: PostgreSQL port 5432, ONLY from the application security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL access from application tier only"
  }

  # Outbound: deny all (RDS does not need to initiate connections)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow outbound (required for RDS internal operations)"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# ---- ElastiCache (Redis) Security Group ----

resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for InboxOS ElastiCache Redis — only accessible from app tier"
  vpc_id      = aws_vpc.main.id

  # Inbound: Redis port 6379, ONLY from the application security group
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis access from application tier only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow outbound (required for ElastiCache internal operations)"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}
