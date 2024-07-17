guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi


compile-node:
	npx tsc --build tsconfig.build.json

compile: compile-node

aws-login:
	aws sso login --sso-session sso-session

sam-sync: guard-AWS_DEFAULT_PROFILE guard-stack_name compile
	sam sync \
		--stack-name $$stack_name \
		--watch \
		--template-file SAMtemplates/main_template.yaml \
		--parameter-overrides \
			  EnableSplunk=false

install-python:
	poetry install

sam-deploy-psu-package: guard-artifact_bucket guard-artifact_bucket_prefix guard-stack_name guard-template_file guard-cloud_formation_execution_role guard-LATEST_TRUSTSTORE_VERSION guard-enable_mutual_tls guard-DYNAMODB_AUTOSCALE guard-VERSION_NUMBER guard-COMMIT_ID guard-VERSION_NUMBER guard-LOG_RETENTION_DAYS guard-TARGET_ENVIRONMENT
	sam deploy \
		--template-file $$template_file \
		--stack-name $$stack_name \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region eu-west-2 \
		--s3-bucket $$artifact_bucket \
		--s3-prefix $$artifact_bucket_prefix \
		--config-file samconfig_package_and_deploy.toml \
		--no-fail-on-empty-changeset \
		--role-arn $$cloud_formation_execution_role \
		--no-confirm-changeset \
		--force-upload \
		--tags "version=$$VERSION_NUMBER" \
		--parameter-overrides \
			  TruststoreVersion=$$LATEST_TRUSTSTORE_VERSION \
			  EnableMutualTLS=$$enable_mutual_tls \
			  EnableSplunk=true \
			  EnableDynamoDBAutoScaling=$$DYNAMODB_AUTOSCALE \
			  VersionNumber=$$VERSION_NUMBER \
			  CommitId=$$COMMIT_ID \
			  LogLevel=$$LOG_LEVEL \
			  LogRetentionInDays=$$LOG_RETENTION_DAYS \
			  Env=$$TARGET_ENVIRONMENT \
			  DeployCheckPrescriptionStatusUpdate=$$DEPLOY_CHECK_PRESCRIPTION_STATUS_UPDATE 