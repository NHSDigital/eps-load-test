guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi


compile-node:
	npx tsc --build tsconfig.build.json

compile: compile-node

aws-configure:
	aws configure sso --region eu-west-2

aws-login:
	aws sso login --sso-session sso-session

sam-sync: guard-AWS_DEFAULT_PROFILE guard-stack_name compile
	sam sync \
		--stack-name $$stack_name \
		--watch \
		--template-file SAMtemplates/main_template.yaml \
		--parameter-overrides \
			  EnableSplunk=false

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

local-notify:
	./scripts/test_notify_load_test.sh