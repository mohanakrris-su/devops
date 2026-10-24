output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.app_server.id
}

output "instance_type" {
  description = "EC2 instance type deployed."
  value       = aws_instance.app_server.instance_type
}

output "s3_bucket_name" {
  description = "Name of the S3 artifacts bucket."
  value       = aws_s3_bucket.artifacts.bucket
}

output "db_endpoint" {
  description = "RDS endpoint address."
  value       = aws_db_instance.database.endpoint
  sensitive   = true
}

output "db_identifier" {
  description = "RDS instance identifier."
  value       = aws_db_instance.database.identifier
}
