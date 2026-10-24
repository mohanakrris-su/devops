# infra-demo

> Sample Terraform configuration used by **CostWatch CI Guard** for cost-estimation
> and policy validation in CI/CD pipelines.

## What This Defines

| Resource | Type | Purpose |
|---|---|---|
| `aws_instance.app_server` | EC2 `t3.small` | Application server |
| `aws_s3_bucket.artifacts` | S3 | Build artifact storage |
| `aws_db_instance.database` | RDS PostgreSQL `db.t4g.micro` | Application database |

Estimated monthly cost: ~$73–90 USD (us-east-1, on-demand pricing, no data transfer).

## ⚠️ Important — Do NOT Run `terraform apply`

This configuration is **for cost-estimation and CI Guard validation only**.

Running `apply` will create real AWS resources and incur real charges.
It requires valid AWS credentials, which are intentionally not provided here.

## Local Usage (Plan Only)

```powershell
# Requires: terraform CLI + AWS credentials configured
cd infra-demo

# First time only
terraform init

# Preview changes — safe, read-only
terraform plan -var="db_password=placeholder"

# Generate a plan file for Infracost (also safe)
terraform plan -var="db_password=placeholder" -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json
infracost breakdown --path tfplan.json
```

## Variables

| Variable | Default | Description |
|---|---|---|
| `project_name` | `costwatch` | Name prefix for all resources |
| `environment` | `dev` | One of: `dev`, `staging`, `prod` |
| `aws_region` | `us-east-1` | Target AWS region |
| `instance_type` | `t3.small` | EC2 instance type |
| `root_volume_size_gb` | `20` | EC2 root EBS volume (GiB) |
| `db_instance_class` | `db.t4g.micro` | RDS instance class |
| `db_storage_gb` | `20` | RDS allocated storage (GiB) |
| `db_password` | *(required)* | Set via `TF_VAR_db_password` — never hardcode |

## Sensitive Values

`db_password` is marked `sensitive = true` in Terraform.
Always pass it via environment variable:

```powershell
# PowerShell
$env:TF_VAR_db_password = "YourSecurePassword123!"
```

```bash
# Bash
export TF_VAR_db_password="YourSecurePassword123!"
```
