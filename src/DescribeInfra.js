"use strict";

const AWS = require("aws-sdk");
const ec2 = new AWS.EC2({ region: "eu-west-3" });

const VpcHelper = require("./VpcHelper");
const SubnetHelper = require("./SubnetHelper");
const SecurityGroupHelper = require("./SecurityGroupHelper");
const InstanceHelper = require("./InstanceHelper");
const KeypairHelper = require("./KeypairHelper");

const { Logger } = require("vir1-core");

module.exports = class DescribeInfra {
    //region public methods

    /**
     * @brief Describe the infrastructure
     * @param vpcName {string} vpcName of a VPC
     * @returns Promise<string>
     */
    async describe(vpcName) {
        const vpc = await new VpcHelper(ec2).describe(vpcName);

        const subnets = await new SubnetHelper(ec2).describe(vpcName);
        const subnetsMapped = subnets.map((this.#mapSubnet));

        const securityGroups = await new SecurityGroupHelper(ec2).describe(vpc.Name);
        const securityGroupsMapped = securityGroups.map(this.#mapSecurityGroup);

        const keyPairs = await new KeypairHelper(ec2).describe();
        const keyPairsMapped = keyPairs.map(this.#mapKeyPair);

        const instances = await new InstanceHelper(ec2).describe(vpc.VpcId);
        const instancesMapped = instances.map(this.#mapInstance);

        const infra = this.#lowerKeysFirstCharRecursive({
            vpcName: vpc.Name,
            vpcCidr: vpc.CidrBlock,
            igwName: vpc.Igw?.Name,
            subnets: subnetsMapped,
            securityGroups: securityGroupsMapped,
            keyPairs: keyPairsMapped,
            instances: instancesMapped,
        });

        Logger.info(`Describe Infrastructure of VPC ${vpcName}`);
        return JSON.stringify(infra, null, 4);
    }

    //endregion public methods

    //region private methods

    #mapSubnet(subnet) {
        return {
            subnetName: subnet.Name,
            subnetCidr: subnet.CidrBlock,
            availabilityZone: subnet.AvailabilityZone,
            routeTables: subnet.RouteTables,
        };
    }

    #mapSecurityGroup(securityGroup) {
        return {
            securityGroupName: securityGroup.GroupName,
            inboundSecurityRules: securityGroup.InboundSecurityRules,
            outboundSecurityRules: securityGroup.OutboundSecurityRules,
        };
    }

    #mapKeyPair(keypair) {
        return {
            keyPairsName: keypair.KeyName,
            type: keypair.KeyType,
        };
    }

    #mapInstance(instance) {
        return {
            instanceName: instance.Tags.find(tag => tag.Key === "Name").Value,
            instancePublicIp: instance.PublicIpAddress || "",
            instancePrivateIp: instance.PrivateIpAddress,
            instanceType: instance.InstanceType,
            plateform: instance.PlatformDetails,
            amiId: instance.ImageId,
            terminationProtection: "",
            usageOperation: instance.UsageOperation,
            SecurityGroupsName: instance.SecurityGroups.map(sg => sg.GroupName),
            keyName: instance.KeyName,
        };
    }

    #lowerKeysFirstCharRecursive(obj) {
        if (obj === null || typeof obj !== "object") return obj;

        let newObjOrArray = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            const newKey = key.charAt(0).toLowerCase() + key.slice(1);
            newObjOrArray[newKey] = this.#lowerKeysFirstCharRecursive(obj[key]);
        }

        return newObjOrArray;
    }

    //endregion
};
