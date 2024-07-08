#!/usr/bin/env bash

client_private_key_arn=$(aws cloudformation list-exports --query "Exports[?Name=='account-resources:PfpClientKeySecret'].Value" --output text)
client_cert_arn=$(aws cloudformation list-exports --query "Exports[?Name=='account-resources:PfpClientCertSecret'].Value" --output text)

client_private_key=$(aws secretsmanager get-secret-value --secret-id "${client_private_key_arn}" --query SecretString --output text)
client_cert=$(aws secretsmanager get-secret-value --secret-id "${client_cert_arn}" --query SecretString --output text)

export client_private_key
export client_cert


artillery run-lambda --region eu-west-2 --lambda-role-arn arn:aws:iam::591291862413:role/dummy-ab-1-ArtilleryLambdaResources-18F8-LambdaRole-lpCMa7O3LuCT "$(dirname "$0")/../artillery/pfp-load-test.yml"
#artillery run "$(dirname "$0")/../artillery/pfp-load-test.yml"