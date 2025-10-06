# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This repository is designed for working with Claude AI code generation and development workflows. It provides a structured environment for experimenting with AI-assisted development, testing code generation patterns, and building tools that integrate with Claude's capabilities.

## Project Structure

- **`src/`** - Core source code and modules
- **`examples/`** - Example implementations and demonstrations
- **`tests/`** - Test suites and testing utilities
- **`docs/`** - Project documentation and guides

## Development Environment Setup

### Multi-Language Support
This project supports both Python and Node.js development environments:

#### Python Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (when requirements.txt exists)
pip install -r requirements.txt

# Run Python examples
python src/main.py
python examples/example_script.py
```

#### Node.js Setup
```bash
# Install dependencies (when package.json exists)
npm install

# Run development server
npm run dev

# Build project
npm run build

# Run tests
npm test
```

## Development Commands

### Testing
```bash
# Run all tests
python -m pytest tests/
npm test

# Run specific test file
python -m pytest tests/test_example.py
npm test -- tests/example.test.js

# Run tests with coverage
python -m pytest --cov=src tests/
npm run test:coverage
```

### Code Quality
```bash
# Format code
black src/ tests/                    # Python
npm run format                       # Node.js

# Lint code
flake8 src/ tests/                   # Python
npm run lint                         # Node.js

# Type checking (if using TypeScript)
npm run type-check
```

### Development Workflow
```bash
# Start development environment
npm run dev                          # For Node.js projects
python src/main.py                   # For Python projects

# Build for production
npm run build
python setup.py build
```

## Architecture Overview

### Core Design Principles
This repository follows a modular architecture designed for:
- **AI Integration** - Built to work seamlessly with Claude AI code generation
- **Extensibility** - Easy to add new examples and experiments
- **Testing** - Comprehensive test coverage for reliable development
- **Documentation** - Clear documentation for all components

### Code Organization
- **Modular Structure** - Each major feature lives in its own module
- **Separation of Concerns** - Clear separation between core logic, examples, and tests
- **Configuration Management** - Environment-based configuration using `.env` files
- **Error Handling** - Consistent error handling patterns throughout

### Development Patterns
- **Example-Driven Development** - New features start as examples before becoming core modules
- **Test-Driven Development** - Tests written alongside or before implementation
- **Documentation-First** - All public APIs documented before implementation
- **Iterative Refinement** - Code evolved through multiple iterations with AI assistance

## Environment Variables

Create a `.env` file in the project root for environment-specific configuration:

```bash
# AI API Configuration
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Development Configuration
NODE_ENV=development
DEBUG=true

# Application Configuration
APP_PORT=3000
LOG_LEVEL=info
```

## Key Implementation Details

### AI Integration Patterns
When working with Claude AI integration:
- Use environment variables for API keys
- Implement proper error handling for API failures
- Add retry logic for transient failures
- Log AI interactions for debugging
- Validate AI responses before using them

### Testing Strategy
- **Unit Tests** - Test individual functions and modules
- **Integration Tests** - Test AI integration and external APIs
- **Example Tests** - Ensure all examples work correctly
- **Performance Tests** - Monitor AI response times and costs

### File Naming Conventions
- **Source files** - `snake_case.py` or `kebab-case.js`
- **Test files** - `test_*.py` or `*.test.js`
- **Example files** - `example_*.py` or `example-*.js`
- **Configuration** - `.env`, `config.json`, `settings.yaml`

## Common Development Tasks

### Adding New Examples
1. Create example file in `examples/` directory
2. Follow existing naming conventions
3. Include docstring/comments explaining the example
4. Add corresponding test in `tests/`
5. Update documentation if needed

### Integrating with Claude AI
1. Set up API credentials in `.env`
2. Use existing client patterns from `src/`
3. Implement proper error handling
4. Add logging for debugging
5. Write tests for AI interactions

### Running Experiments
1. Create experimental code in `examples/`
2. Use meaningful names and documentation
3. Test thoroughly before moving to `src/`
4. Clean up temporary files after experiments

## Debugging and Development

### Logging
```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug

# View logs
tail -f logs/development.log
```

### Common Issues
- **API Rate Limits** - Implement exponential backoff
- **Token Limits** - Chunk large requests appropriately
- **Network Issues** - Add retry logic with reasonable timeouts
- **Environment Issues** - Verify all required environment variables are set

### Performance Monitoring
- Monitor API usage and costs
- Track response times for AI interactions
- Profile code for bottlenecks
- Use caching where appropriate

## Best Practices

### Code Style
- Follow language-specific style guides (PEP 8 for Python, Standard for JavaScript)
- Use meaningful variable and function names
- Keep functions small and focused
- Document complex algorithms and AI integration patterns

### Security
- Never commit API keys or secrets
- Use environment variables for sensitive configuration
- Validate all inputs, especially AI-generated content
- Implement proper authentication for any web interfaces

### AI Development
- Always validate AI-generated code before using it
- Implement fallback behavior for AI failures
- Monitor AI costs and usage patterns
- Keep prompts and AI interactions well-documented