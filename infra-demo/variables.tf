variable "project_name" {
  description = "A short identifier used in resource names and tags."
  type        = string
  default     = "costwatch"
}

variable "environment" {
  description = "Deployment environment label (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "AMI ID for the EC2 instance. Defaults to a public Amazon Linux 2023 AMI in us-east-1."
  type        = string
  default     = "ami-0c02fb55956c7d316" # Amazon Linux 2023 (us-east-1) — update for other regions
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size_gb" {
  description = "Size of the EC2 root EBS volume in GiB."
  type        = number
  default     = 20
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_storage_gb" {
  description = "Allocated storage for the RDS instance in GiB."
  type        = number
  default     = 20
}

variable "db_password" {
  description = "Master password for the RDS instance. Pass via TF_VAR_db_password — never hardcode."
  type        = string
  sensitive   = true
  # No default — must be provided explicitly.
}
