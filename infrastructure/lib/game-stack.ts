import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export interface GameStackProps extends cdk.StackProps {
  readonly environment: 'dev' | 'prod';
}

/**
 * EC2-based stack for the Dungeons Crawl game server.
 *
 * Each environment gets its own VPC, security group, and EC2 instance.
 * The instance runs the Greenwood SSR server (Node.js) on port 8080,
 * fronted by the OS's nginx reverse proxy on port 80.
 *
 * Deployment of the application artefacts (build output) is handled
 * separately (e.g. CodeDeploy or a simple SCP step in CI) — the CDK
 * stack only provisions the infrastructure.
 */
export class GameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GameStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProd = environment === 'prod';

    // ── Network ───────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: isProd ? 2 : 1,
      natGateways: 0, // keep costs low; instances are in public subnets
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, 'InstanceSg', {
      vpc,
      description: `${environment} game server`,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');
    // SSH access restricted to operator IP; set SSM_OPERATOR_CIDR env var or
    // use SSM Session Manager (enabled via the IAM managed policy below).

    // ── IAM ───────────────────────────────────────────────────────────────
    const role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        // Enables SSM Session Manager — no inbound SSH port required
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // ── EC2 Instance ──────────────────────────────────────────────────────
    const instanceType = isProd
      ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
      : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      // Update and install dependencies
      'dnf update -y',
      'dnf install -y nginx',

      // Install Node.js 24 via NodeSource
      'curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -',
      'dnf install -y nodejs',

      // Install pnpm globally
      'npm install -g pnpm',

      // Create application directories
      'mkdir -p /opt/dungeons-crawl/app',
      'mkdir -p /var/log/dungeons-crawl',
      'chown -R ec2-user:ec2-user /opt/dungeons-crawl /var/log/dungeons-crawl',

      // nginx reverse proxy — proxies :80 → :8080 (Greenwood serve port)
      'cat > /etc/nginx/conf.d/dungeons-crawl.conf <<\'EOF\'',
      'server {',
      '    listen 80;',
      '    location / {',
      '        proxy_pass http://127.0.0.1:8080;',
      '        proxy_http_version 1.1;',
      '        proxy_set_header Upgrade $http_upgrade;',
      '        proxy_set_header Connection "upgrade";',
      '        proxy_set_header Host $host;',
      '    }',
      '}',
      'EOF',
      'systemctl enable --now nginx',

      // Systemd unit for the Greenwood server (app files deployed separately)
      'cat > /etc/systemd/system/dungeons-crawl.service <<\'EOF\'',
      '[Unit]',
      'Description=Dungeons Crawl Game Server',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=ec2-user',
      'WorkingDirectory=/opt/dungeons-crawl/app',
      'Environment=NODE_ENV=production',
      `Environment=LOG_DIR=/var/log/dungeons-crawl`,
      'ExecStart=/usr/bin/node node_modules/.bin/greenwood serve',
      'Restart=on-failure',
      'RestartSec=5',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      'systemctl daemon-reload',
      // Service is enabled but not started — the app must be deployed first
      'systemctl enable dungeons-crawl',
    );

    const instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      role,
      userData,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
    });

    // ── Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'EC2 instance ID (use with SSM Session Manager)',
    });

    new cdk.CfnOutput(this, 'PublicIp', {
      value: instance.instancePublicIp,
      description: 'Public IP of the game server',
    });
  }
}
