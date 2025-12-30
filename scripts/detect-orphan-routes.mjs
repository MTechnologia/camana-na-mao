#!/usr/bin/env node
/**
 * Orphan Routes Detector
 * 
 * This script analyzes the codebase to detect routes that are defined in App.tsx
 * but have no navigation references (Link, navigate, etc.) elsewhere in the code.
 * 
 * Usage:
 *   node scripts/detect-orphan-routes.mjs [--strict] [--json]
 * 
 * Options:
 *   --strict  Exit with code 1 if orphan routes are found (for CI/CD)
 *   --json    Output results as JSON
 * 
 * Exit codes:
 *   0 - No orphan routes found (or --strict not enabled)
 *   1 - Orphan routes found (with --strict)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration
const CONFIG = {
  appFile: 'src/App.tsx',
  searchDirs: ['src'],
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  // Routes that are intentionally without direct navigation (e.g., dynamic routes, redirects)
  ignoredPatterns: [
    /^\/docs$/, // Redirect route
    /:\w+/, // Dynamic params like :id, :reportId
  ],
  // Patterns to detect route references
  referencePatterns: [
    /to=["'`]([^"'`]+)["'`]/g,           // Link to="..."
    /navigate\(["'`]([^"'`]+)["'`]/g,    // navigate("...")
    /href=["'`]([^"'`]+)["'`]/g,         // href="..."
    /path:\s*["'`]([^"'`]+)["'`]/g,      // path: "..."
    /route:\s*["'`]([^"'`]+)["'`]/g,     // route: "..."
    /["'`](\/[a-z][a-z0-9\-\/]*)["'`]/gi, // Any "/path" string
  ],
};

// Parse command line arguments
const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const jsonOutput = args.includes('--json');

/**
 * Extract route definitions from App.tsx
 */
function extractRoutes(appContent) {
  const routes = [];
  
  // Match Route component definitions
  const routeRegex = /<Route\s+path=["'`]([^"'`]+)["'`]/g;
  let match;
  
  while ((match = routeRegex.exec(appContent)) !== null) {
    const path = match[1];
    routes.push({
      path,
      isRedirect: appContent.includes(`path="${path}"`) && 
                  appContent.substring(match.index, match.index + 200).includes('Navigate'),
      isDynamic: path.includes(':'),
    });
  }
  
  return routes;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!item.startsWith('.') && item !== 'node_modules') {
        getAllFiles(fullPath, files);
      }
    } else if (CONFIG.extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Find all route references in the codebase
 */
function findRouteReferences(files, appFilePath) {
  const references = new Map();
  
  for (const file of files) {
    // Skip the App.tsx file itself for reference counting
    const relativePath = relative(PROJECT_ROOT, file);
    const isAppFile = relativePath === CONFIG.appFile;
    
    const content = readFileSync(file, 'utf-8');
    
    for (const pattern of CONFIG.referencePatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const route = match[1];
        
        // Only count non-App.tsx references
        if (!isAppFile && route.startsWith('/')) {
          if (!references.has(route)) {
            references.set(route, []);
          }
          references.get(route).push({
            file: relativePath,
            line: content.substring(0, match.index).split('\n').length,
          });
        }
      }
    }
  }
  
  return references;
}

/**
 * Check if a route matches any ignored pattern
 */
function isIgnored(route) {
  return CONFIG.ignoredPatterns.some(pattern => pattern.test(route));
}

/**
 * Normalize route for comparison (remove trailing slashes, etc.)
 */
function normalizeRoute(route) {
  return route.replace(/\/+$/, '') || '/';
}

/**
 * Check if a route has references (including partial matches for dynamic routes)
 */
function hasReferences(route, references) {
  const normalized = normalizeRoute(route);
  
  // Direct match
  if (references.has(normalized)) {
    return { found: true, refs: references.get(normalized) };
  }
  
  // For dynamic routes, check if the base path is referenced
  if (route.includes(':')) {
    const basePath = route.split(':')[0].replace(/\/$/, '');
    for (const [ref] of references) {
      if (ref.startsWith(basePath)) {
        return { found: true, refs: references.get(ref) };
      }
    }
  }
  
  // Check for references that could match this route
  for (const [ref, locs] of references) {
    if (ref.includes('$') || ref.includes('{')) continue; // Skip template literals
    
    const refNormalized = normalizeRoute(ref);
    if (refNormalized === normalized) {
      return { found: true, refs: locs };
    }
  }
  
  return { found: false, refs: [] };
}

/**
 * Main analysis function
 */
function analyze() {
  const appFilePath = join(PROJECT_ROOT, CONFIG.appFile);
  const appContent = readFileSync(appFilePath, 'utf-8');
  
  // Extract all routes
  const routes = extractRoutes(appContent);
  
  // Get all source files
  const files = [];
  for (const dir of CONFIG.searchDirs) {
    getAllFiles(join(PROJECT_ROOT, dir), files);
  }
  
  // Find all references
  const references = findRouteReferences(files, appFilePath);
  
  // Analyze each route
  const results = {
    total: routes.length,
    orphans: [],
    redirects: [],
    dynamic: [],
    healthy: [],
    timestamp: new Date().toISOString(),
  };
  
  for (const route of routes) {
    // Skip ignored patterns
    if (isIgnored(route.path)) {
      continue;
    }
    
    // Categorize redirects
    if (route.isRedirect) {
      results.redirects.push(route.path);
      continue;
    }
    
    // Check for references
    const { found, refs } = hasReferences(route.path, references);
    
    if (!found) {
      results.orphans.push({
        path: route.path,
        isDynamic: route.isDynamic,
        suggestion: route.isDynamic 
          ? 'Dynamic route - verify parent route has navigation'
          : 'Add navigation link or remove route',
      });
    } else {
      results.healthy.push({
        path: route.path,
        referenceCount: refs.length,
      });
    }
  }
  
  return results;
}

/**
 * Format and output results
 */
function outputResults(results) {
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log('\n🔍 Orphan Routes Analysis Report');
  console.log('═'.repeat(50));
  console.log(`📅 ${results.timestamp}`);
  console.log(`📊 Total routes analyzed: ${results.total}`);
  console.log('');
  
  if (results.orphans.length === 0) {
    console.log('✅ No orphan routes detected!');
  } else {
    console.log(`⚠️  Found ${results.orphans.length} orphan route(s):\n`);
    
    for (const orphan of results.orphans) {
      console.log(`  ❌ ${orphan.path}`);
      console.log(`     └─ ${orphan.suggestion}`);
    }
  }
  
  if (results.redirects.length > 0) {
    console.log(`\n📎 Redirect routes (${results.redirects.length}):`);
    for (const redirect of results.redirects) {
      console.log(`  ↪️  ${redirect}`);
    }
  }
  
  console.log(`\n✅ Healthy routes with navigation: ${results.healthy.length}`);
  console.log('═'.repeat(50));
  
  if (strictMode && results.orphans.length > 0) {
    console.log('\n❌ CI/CD check failed: orphan routes detected');
    console.log('   Fix: Add navigation to these routes or remove them\n');
  }
}

// Run analysis
try {
  const results = analyze();
  outputResults(results);
  
  // Exit with error in strict mode if orphans found
  if (strictMode && results.orphans.length > 0) {
    process.exit(1);
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error during analysis:', error.message);
  process.exit(2);
}
