#!/usr/bin/env bash
set -eu pipefail

echo "API type: ${API_TYPE}"
echo "Proxygen path: ${PROXYGEN_PATH}"
echo "Specification path: ${SPEC_PATH}"
echo "Specification version: ${VERSION_NUMBER}"
echo "Stack name: ${STACK_NAME}"
echo "AWS environment: ${AWS_ENVIRONMENT}"
echo "Apigee environment: ${APIGEE_ENVIRONMENT}"
echo "Proxygen private key name: ${PROXYGEN_PRIVATE_KEY_NAME}"
echo "Proxygen KID: ${PROXYGEN_KID}"
echo "Deploy Check Prescription Status Update: ${DEPLOY_CHECK_PRESCRIPTION_STATUS_UPDATE}"
echo "Dry run: ${DRY_RUN}"

is_pull_request=false
instance_suffix=""
if [[ ${STACK_NAME} == psu-pr-* ]]; then
    is_pull_request=true
    # Extracting the PR ID from $STACK_NAME
    pr_id=$(echo "${STACK_NAME}" | cut -d'-' -f3)
    instance_suffix=-"pr-${pr_id}"
fi

# Determine the proxy instance based on the provided $STACK_NAME
if [[ "${API_TYPE}" == "standard" ]]; then
    instance="prescription-status-update${instance_suffix}"
    apigee_api=prescription-status-update-api
else
    instance="custom-prescription-status-update${instance_suffix}"
    apigee_api=custom-prescription-status-update-api
fi

echo "Is pull request: ${is_pull_request}"
echo "Proxy instance: ${instance}"
echo "Apigee api: ${apigee_api}"

echo


echo "Fixing the spec"
# Find and replace the title
title=$(jq -r '.info.title' "${SPEC_PATH}")
if [[ "${is_pull_request}" == "true" ]]; then
    jq --arg title "[PR-${pr_id}] $title" '.info.title = $title' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
fi

# Find and replace the specification version number 
jq --arg version "${VERSION_NUMBER}" '.info.version = $version' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"

# Find and replace the x-nhsd-apim.target.url value
jq --arg stack_name "${STACK_NAME}" --arg aws_env "${AWS_ENVIRONMENT}" '.["x-nhsd-apim"].target.url = "https://\($stack_name).\($aws_env).eps.national.nhs.uk"' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"

# Find and replace the servers object
if [[ "${APIGEE_ENVIRONMENT}" == "prod" ]]; then
    jq --arg inst "${instance}" '.servers = [ { "url": "https://api.service.nhs.uk/\($inst)" } ]' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
else
    jq --arg env "${APIGEE_ENVIRONMENT}" --arg inst "${instance}" '.servers = [ { "url": "https://\($env).api.service.nhs.uk/\($inst)" } ]' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
fi

# Find and replace securitySchemes
if [[ "${APIGEE_ENVIRONMENT}" == "prod" ]]; then
    if [[ "${API_TYPE}" == "standard" ]]; then
        jq '.components.securitySchemes."app-level3" = {"$ref": "https://proxygen.prod.api.platform.nhs.uk/components/securitySchemes/app-level3"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
    else
        jq '.components.securitySchemes."app-level0" = {"$ref": "https://proxygen.prod.api.platform.nhs.uk/components/securitySchemes/app-level0"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
    fi
else
    if [[ "${API_TYPE}" == "standard" ]]; then
        jq '.components.securitySchemes."app-level3" = {"$ref": "https://proxygen.ptl.api.platform.nhs.uk/components/securitySchemes/app-level3"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
    else
        jq '.components.securitySchemes."app-level0" = {"$ref": "https://proxygen.ptl.api.platform.nhs.uk/components/securitySchemes/app-level0"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
    fi
fi

# Remove target attributes if the environment is sandbox
if [[ "${APIGEE_ENVIRONMENT}" == *"sandbox"* ]]; then
    echo "Removing target attributes for sandbox environment"
    jq 'del(."x-nhsd-apim"."target-attributes")' "$SPEC_PATH" > temp.json && mv temp.json "$SPEC_PATH"
fi

# Remove checkprescriptionstatusupdates if its not needed
if [[ "${DEPLOY_CHECK_PRESCRIPTION_STATUS_UPDATE}" == "false" ]]; then
    if [[ "${API_TYPE}" == "standard" ]]; then
        echo "Removing checkprescriptionstatusupdates endpoint"
        jq 'del(.paths."/checkprescriptionstatusupdates")' "$SPEC_PATH" > temp.json && mv temp.json "$SPEC_PATH"
    fi
fi


echo

echo "Retrieving proxygen credentials"

# Retrieve the proxygen private key and client private key and cert from AWS Secrets Manager
proxygen_private_key_arn=$(aws cloudformation list-exports --query "Exports[?Name=='account-resources:${PROXYGEN_PRIVATE_KEY_NAME}'].Value" --output text)
client_private_key_arn=$(aws cloudformation list-exports --query "Exports[?Name=='account-resources:PsuClientKeySecret'].Value" --output text)
client_cert_arn=$(aws cloudformation list-exports --query "Exports[?Name=='account-resources:PsuClientCertSecret'].Value" --output text)

client_private_key=$(aws secretsmanager get-secret-value --secret-id "${client_private_key_arn}" --query SecretString --output text)
client_cert=$(aws secretsmanager get-secret-value --secret-id "${client_cert_arn}" --query SecretString --output text)

if [[ "${is_pull_request}" == "false" ]]; then
    echo
    echo "Store the secret used for mutual TLS to AWS using Proxygen proxy lambda"
    if [[ "${DRY_RUN}" == "false" ]]; then
        jq -n --arg apiName "${apigee_api}" \
            --arg environment "${APIGEE_ENVIRONMENT}" \
            --arg secretName "psu-mtls-1" \
            --arg secretKey "${client_private_key}" \
            --arg secretCert "${client_cert}" \
            --arg kid "${PROXYGEN_KID}" \
            --arg proxygenSecretName "${proxygen_private_key_arn}" \
            '{apiName: $apiName, environment: $environment, secretName: $secretName, secretKey: $secretKey, secretCert: $secretCert, kid, $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

        aws lambda invoke --function-name "lambda-resources-ProxygenPTLMTLSSecretPut" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json
        if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
            echo 'Error calling lambda'
            cat out.txt
            exit 1
        fi
        echo "Secret stored succesfully"

    else
        echo "Would call lambda-resources-ProxygenPTLMTLSSecretPut"
    fi
fi

echo
echo "Deploy the API instance using Proxygen proxy lambda"
if [[ "${DRY_RUN}" == "false" ]]; then

    jq -n --argfile spec "${SPEC_PATH}" \
        --arg apiName "${apigee_api}" \
        --arg environment "${APIGEE_ENVIRONMENT}" \
        --arg instance "${instance}" \
        --arg kid "${PROXYGEN_KID}" \
        --arg proxygenSecretName "${proxygen_private_key_arn}" \
        '{apiName: $apiName, environment: $environment, specDefinition: $spec, instance: $instance, kid: $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

    aws lambda invoke --function-name "lambda-resources-ProxygenPTLInstancePut" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json

    if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
        echo 'Error calling lambda'
        cat out.txt
        exit 1
    fi
    echo "Instance deployed"
else
    echo "Would call lambda-resources-ProxygenPTLInstancePut"
fi

if [[ "${APIGEE_ENVIRONMENT}" == "internal-dev" ]]; then
    echo
    echo "Deploy the API spec if in the int environment"
    if [[ "${DRY_RUN}" == "false" ]]; then
        jq -n --argfile spec "${SPEC_PATH}" \
            --arg apiName "${apigee_api}" \
            --arg environment "uat" \
            --arg instance "${instance}" \
            --arg kid "${PROXYGEN_KID}" \
            --arg proxygenSecretName "${proxygen_private_key_arn}" \
            '{apiName: $apiName, environment: $environment, specDefinition: $spec, instance: $instance, kid: $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

    aws lambda invoke --function-name "lambda-resources-ProxygenPTLSpecPublish" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json

    else
        echo "Would call lambda-resources-ProxygenPTLSpecPublish"
    fi
fi

if [[ "${APIGEE_ENVIRONMENT}" == "internal-dev" && "${is_pull_request}" == "false" ]]; then
    echo
    echo "Deploy the API spec to uat if in the internal-dev environment"
    if [[ "${DRY_RUN}" == "false" ]]; then
        "${PROXYGEN_PATH}" spec publish --uat --no-confirm "${SPEC_PATH}"
    else
        echo "Would run this command"
        echo "${PROXYGEN_PATH} spec publish --uat --no-confirm ${SPEC_PATH}"
    fi
fi
