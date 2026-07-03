# ============================================================
# InboxOS — Terraform AWS Provider Configuration
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state backend (configure for your team)
  # backend "s3" {
  #   bucket         = "inboxos-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "inboxos-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "InboxOS"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
