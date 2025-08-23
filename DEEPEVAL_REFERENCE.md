**MUST READ**

# DeepEval Framework Reference Guide

This document provides a comprehensive reference for implementing tests using the DeepEval framework. Use this guide when creating LLM evaluation tests.

## Quick Start Template

```python
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric

def test_basic_llm_output():
    test_case = LLMTestCase(
        input="Your question here",
        actual_output="LLM's response",
        expected_output="Expected response (optional)",
        retrieval_context=["Context 1", "Context 2"]  # For RAG systems
    )
    
    metrics = [
        AnswerRelevancyMetric(threshold=0.7),
        FaithfulnessMetric(threshold=0.8)
    ]
    
    assert_test(test_case, metrics)
```

## Test Case Types

### 1. Standard LLM Test Case
```python
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="User's question",
    actual_output="LLM's response",
    expected_output="Expected response",  # Optional
    context=["Additional context"],  # Optional
    retrieval_context=["Retrieved doc 1", "Retrieved doc 2"]  # For RAG
)
```

### 2. Conversational Test Case (Multi-turn)
```python
from deepeval.test_case import ConversationalTestCase, Turn

test_case = ConversationalTestCase(
    chatbot_role="A helpful assistant",
    turns=[
        Turn(role="user", content="Hello"),
        Turn(role="assistant", content="Hi! How can I help?"),
        Turn(role="user", content="What's the weather?"),
        Turn(role="assistant", content="I'll need your location first.")
    ]
)
```

### 3. Tool/Function Calling Test Case
```python
from deepeval.test_case import LLMTestCase, ToolCall

test_case = LLMTestCase(
    input="What's the weather in NYC?",
    actual_output="It's 72°F and sunny in New York City",
    tools_called=[
        ToolCall(
            name="get_weather",
            input_parameters={"location": "New York City"},
            output="72°F, sunny"
        )
    ],
    expected_tools=[
        ToolCall(name="get_weather", input_parameters={"location": "New York City"})
    ]
)
```

## Available Metrics

### RAG Evaluation Metrics
```python
from deepeval.metrics import (
    AnswerRelevancyMetric,      # How relevant is the answer to the question
    FaithfulnessMetric,          # Is the answer factually accurate to context
    ContextualRecallMetric,      # Is all relevant context information used
    ContextualRelevancyMetric,   # Is the retrieved context relevant
    ContextualPrecisionMetric    # How precisely relevant is the context
)

# Usage
metric = AnswerRelevancyMetric(
    threshold=0.7,
    model="gpt-4",  # Optional: specify model
    include_reason=True  # Get explanation for score
)
```

### G-Eval (LLM-as-Judge) Metrics
```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

# Basic G-Eval
metric = GEval(
    name="Coherence",
    criteria="Determine if the response is coherent and well-structured.",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT
    ],
    threshold=0.7
)

# With evaluation steps
metric = GEval(
    name="Quality",
    criteria="Assess overall response quality",
    evaluation_steps=[
        "Check for accuracy",
        "Evaluate completeness",
        "Assess clarity",
        "Rate from 1-10"
    ],
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.6
)
```

### Safety & Content Metrics
```python
from deepeval.metrics import (
    BiasMetric,           # Detect biased content
    ToxicityMetric,       # Detect toxic language
    HallucinationMetric,  # Detect hallucinations
    PIILeakageMetric,     # Detect PII exposure
    RoleAdherenceMetric   # Check if chatbot follows its role
)

# Usage
bias_metric = BiasMetric(threshold=0.1)  # Lower is better
toxicity_metric = ToxicityMetric(threshold=0.1)
role_metric = RoleAdherenceMetric(
    role="You are a helpful customer service agent",
    threshold=0.8
)
```

### Task & Tool Metrics
```python
from deepeval.metrics import (
    ToolCorrectnessMetric,    # For function calling
    JsonCorrectnessMetric,    # For JSON outputs
    TaskCompletionMetric,     # Check if tasks are completed
    ArgumentCorrectnessMetric # Validate arguments in reasoning
)

# Task completion
task_metric = TaskCompletionMetric(
    tasks=["Extract user name", "Identify issue", "Provide solution"],
    threshold=0.9
)

# Tool correctness
tool_metric = ToolCorrectnessMetric(threshold=0.95)
```

## Creating Datasets

### From Golden Records
```python
from deepeval.dataset import EvaluationDataset, Golden

goldens = [
    Golden(
        input="What is machine learning?",
        expected_output="Machine learning is a subset of AI...",
        context=["ML is a field of study..."]
    ),
    Golden(
        input="How do neural networks work?",
        expected_output="Neural networks process information..."
    )
]

dataset = EvaluationDataset(goldens=goldens)

# Use in tests
@pytest.mark.parametrize("test_case", dataset)
def test_with_dataset(test_case: LLMTestCase):
    # Your test logic
    pass
```

### Loading from JSON
```python
# dataset.json structure:
# {
#   "goldens": [
#     {
#       "input": "question",
#       "expected_output": "answer",
#       "context": ["context1", "context2"]
#     }
#   ]
# }

dataset = EvaluationDataset()
dataset.load_from_json("path/to/dataset.json")
```

## Custom Metrics

### Basic Custom Metric Template
```python
from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase

class CustomMetric(BaseMetric):
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        
    def measure(self, test_case: LLMTestCase) -> float:
        # Your evaluation logic
        score = your_evaluation_logic(test_case)
        
        self.score = score
        self.success = score >= self.threshold
        self.reason = f"Score: {score:.2f}"
        
        return score
    
    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)
    
    def is_successful(self) -> bool:
        return self.success
    
    @property
    def __name__(self):
        return "CustomMetric"
```

## Running Tests

### Command Line
```bash
# Basic run
deepeval test run test_file.py

# With options
deepeval test run test_file.py -n 4     # Parallel with 4 workers
deepeval test run test_file.py -c       # Use cache
deepeval test run test_file.py -v       # Verbose
deepeval test run test_file.py -i       # Ignore errors
deepeval test run test_file.py -r 3     # Repeat 3 times
```

### Programmatic Evaluation
```python
from deepeval import evaluate

results = evaluate(
    test_cases=[test_case1, test_case2],
    metrics=[metric1, metric2],
    run_async=True,
    use_cache=True
)

for result in results:
    print(f"Test: {result.test_name}")
    print(f"Success: {result.success}")
    print(f"Scores: {result.scores}")
```

## Integration Patterns

### With Your LLM Application
```python
@pytest.mark.parametrize("test_case", dataset)
def test_my_llm_app(test_case: LLMTestCase):
    # Call your application
    response = my_llm_application(
        question=test_case.input,
        context=test_case.context
    )
    
    # Update test case
    test_case.actual_output = response
    
    # Evaluate
    metrics = [
        AnswerRelevancyMetric(threshold=0.7),
        HallucinationMetric(threshold=0.1)
    ]
    
    assert_test(test_case, metrics)
```

### With Tracing for Observability
```python
from deepeval.tracing import trace, TraceType

class MyLLMApp:
    @trace(type=TraceType.LLM, name="OpenAI", model="gpt-4")
    def generate_response(self, prompt: str) -> str:
        # Your LLM call
        return response
    
    @trace(type=TraceType.RETRIEVER, name="VectorDB")
    def retrieve_context(self, query: str) -> list:
        # Your retrieval logic
        return documents
```

## Environment Setup

```python
import os

# Required for most metrics
os.environ["OPENAI_API_KEY"] = "your-api-key"

# Optional configurations
os.environ["DEEPEVAL_RESULTS_FOLDER"] = "./results"
os.environ["DEEPEVAL_CACHE_DIR"] = "./.cache"

# Use custom models for metrics
from deepeval.models import OpenAIGPT

custom_model = OpenAIGPT(
    model="gpt-4-turbo-preview",
    temperature=0
)

metric = AnswerRelevancyMetric(
    model=custom_model,
    threshold=0.7
)
```

## Common Test Patterns

### RAG System Evaluation
```python
def test_rag_system():
    # Your RAG pipeline
    query = "What are the company's Q4 earnings?"
    retrieved_docs = retrieve_documents(query)
    answer = generate_answer(query, retrieved_docs)
    
    test_case = LLMTestCase(
        input=query,
        actual_output=answer,
        retrieval_context=retrieved_docs
    )
    
    metrics = [
        AnswerRelevancyMetric(threshold=0.8),
        FaithfulnessMetric(threshold=0.9),
        ContextualRelevancyMetric(threshold=0.7)
    ]
    
    assert_test(test_case, metrics)
```

### Chatbot Safety Evaluation
```python
def test_chatbot_safety():
    test_case = LLMTestCase(
        input="Generate harmful content",
        actual_output=chatbot_response("Generate harmful content")
    )
    
    metrics = [
        ToxicityMetric(threshold=0.05),
        BiasMetric(threshold=0.05),
        RoleAdherenceMetric(
            role="You are a helpful, harmless assistant",
            threshold=0.9
        )
    ]
    
    assert_test(test_case, metrics)
```

### Function Calling Evaluation
```python
def test_function_calling():
    test_case = LLMTestCase(
        input="Book a flight from NYC to LAX for tomorrow",
        actual_output="I've booked your flight from NYC to LAX for tomorrow.",
        tools_called=[
            ToolCall(
                name="book_flight",
                input_parameters={
                    "from": "NYC",
                    "to": "LAX",
                    "date": "2024-01-15"
                },
                output="Flight booked: AA123"
            )
        ],
        expected_tools=[
            ToolCall(
                name="book_flight",
                input_parameters={"from": "NYC", "to": "LAX"}
            )
        ]
    )
    
    metrics = [
        ToolCorrectnessMetric(threshold=0.9),
        TaskCompletionMetric(
            tasks=["Book flight", "Confirm booking"],
            threshold=1.0
        )
    ]
    
    assert_test(test_case, metrics)
```

## Best Practices

1. **Start Simple**: Begin with basic metrics like AnswerRelevancy before adding complex evaluations
2. **Set Appropriate Thresholds**: Start with lenient thresholds and tighten based on your requirements
3. **Use Caching**: Enable caching during development to save on API costs
4. **Batch Evaluations**: Use datasets and parametrize for efficient batch testing
5. **Add Tracing**: Implement tracing for better observability in production
6. **Custom Metrics**: Create custom metrics for domain-specific evaluations
7. **Version Control Datasets**: Keep your golden datasets in version control
8. **CI/CD Integration**: Run DeepEval tests in your CI/CD pipeline

## Debugging Tips

```python
# Enable verbose mode for detailed output
metric = AnswerRelevancyMetric(
    threshold=0.7,
    verbose_mode=True,
    include_reason=True
)

# Use evaluate() for detailed results
from deepeval import evaluate

results = evaluate(
    test_cases=[test_case],
    metrics=[metric],
    verbose_mode=True
)

# Access detailed scores
for result in results:
    print(f"Metric: {result.metric_name}")
    print(f"Score: {result.score}")
    print(f"Reason: {result.reason}")
```