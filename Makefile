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

sam-build: sam-validate compile
	sam build --template-file SAMtemplates/main_template.yaml --region eu-west-2

sam-validate: 
	sam validate --template-file SAMtemplates/main_template.yaml --region eu-west-2
	sam validate --template-file SAMtemplates/functions/lambda_resources.yaml --region eu-west-2

sam-deploy-package: guard-artifact_bucket guard-artifact_bucket_prefix guard-stack_name guard-template_file guard-cloud_formation_execution_role guard-VERSION_NUMBER guard-COMMIT_ID guard-LOG_LEVEL guard-LOG_RETENTION_DAYS guard-TARGET_ENVIRONMENT
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
			EnableSplunk=true \
			VersionNumber=$$VERSION_NUMBER \
			CommitId=$$COMMIT_ID \
			LogLevel=$$LOG_LEVEL \
			LogRetentionInDays=$$LOG_RETENTION_DAYS

install: install-node

install-python:
	poetry install

install-node:
	npm ci

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite

local-cpsu:
	./scripts/test_cpsu_load_test.sh

local-psu:
	./scripts/test_psu_load_test.sh