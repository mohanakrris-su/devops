terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend intentionally left local for demo purposes.
  # In a real environment, configure an S3 + DynamoDB backend here.
}

provider "aws" {
  region = var.aws_region

  # No credentials are embedded here. When running locally, configure via:
  #   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY environment variables, or
  #   an AWS credentials file (~/.aws/credentials).
  #
  # This demo is intended for `terraform plan` / cost-estimation only.
  # Do NOT run `terraform apply` unless you have a real AWS account
  # and intend to incur costs.
}

# ─── EC2 Instance ────────────────────────────────────────────────────────────

resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = var.instance_type

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
  }

  tags = {
    Name        = "${var.project_name}-server"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ─── S3 Bucket ───────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_name}-artifacts-${var.environment}"

  tags = {
    Name        = "${var.project_name}-artifacts"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# ─── RDS Instance ────────────────────────────────────────────────────────────

resource "aws_db_instance" "database" {
  identifier        = "${var.project_name}-db-${var.environment}"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage_gb
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "costwatch"
  username = "costwatch_admin"
  password = var.db_password # Passed via TF_VAR_db_password — never hardcoded

  skip_final_snapshot = true # Demo config only
  publicly_accessible = false

  tags = {
    Name        = "${var.project_name}-database"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
