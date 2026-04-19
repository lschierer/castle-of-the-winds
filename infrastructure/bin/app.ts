#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GameStack } from '../lib/game-stack';

const app = new cdk.App();

new GameStack(app, 'DungeonsDevStack', {
  environment: 'dev',
  description: 'Dungeons Crawl — development environment',
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
  },
  tags: {
    Project: 'dungeons-crawl',
    Environment: 'dev',
  },
});

new GameStack(app, 'DungeonsProdStack', {
  environment: 'prod',
  description: 'Dungeons Crawl — production environment',
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
  },
  tags: {
    Project: 'dungeons-crawl',
    Environment: 'prod',
  },
});

app.synth();
