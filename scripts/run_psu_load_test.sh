#!/usr/bin/env bash

security_group=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "vpc-resources:VpcDefaultSecurityGroup") | .Value' | grep -o '[^:]*$')
export security_group="sg-06084b206aa260b31"
vpc_subnets=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "vpc-resources:PrivateSubnets") | .Value' | grep -o '[^:]*$')
export vpc_subnets

artillery_worker_role_name=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "artillery-resources:ArtilleryWorkerRoleName") | .Value' | grep -o '[^:]*$')
export artillery_worker_role_name


#artillery run artillery/psu_load_test.yml
npx artillery run-fargate \
    --secret psu_api_key \
    --secret psu_private_key \
    --secret psu_kid \
    --region eu-west-2 \
    --security-group-ids ${security_group} \
    --subnet-ids ${vpc_subnets} \
    --task-role-name ${artillery_worker_role_name} \
    artillery/psu_load_test.yml