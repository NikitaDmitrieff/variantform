#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("variantform")
  .description("Git-native overlay tool for managing per-client SaaS product variants")
  .version("0.1.0");

program.parse();
