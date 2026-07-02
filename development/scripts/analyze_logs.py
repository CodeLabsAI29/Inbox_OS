#!/usr/bin/env python3
"""
analyze_logs.py
Analyzes API latency/response-time logs stored in a JSONL (JSON Lines) file.
Computes and prints average, median, 90th percentile, and 99th percentile latencies.

Usage:
  python analyze_logs.py [path_to_logs_file.jsonl]
"""

import sys
import os
import json
import pandas as pd

def parse_arguments():
    # Default to api_latency.jsonl in the current directory if no argument is provided.
    file_path = "api_latency.jsonl"
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    return file_path

def load_jsonl_robustly(file_path):
    """
    Reads a JSONL file line-by-line. Parses valid JSON lines,
    tracks count of malformed lines, and returns a list of dictionaries.
    """
    records = []
    lines_count = 0
    corrupt_lines_count = 0
    
    if not os.path.exists(file_path):
        print(f"Error: Log file '{file_path}' does not exist.", file=sys.stderr)
        sys.exit(1)
        
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue  # skip blank lines
            lines_count += 1
            try:
                record = json.loads(line)
                if isinstance(record, dict):
                    records.append(record)
                else:
                    # JSON was parsed but is not an object (e.g. it was just a string or number)
                    corrupt_lines_count += 1
            except json.JSONDecodeError:
                corrupt_lines_count += 1
                
    return records, lines_count, corrupt_lines_count

def find_latency_column(df):
    """
    Identifies the key used for latency/response time in the DataFrame.
    """
    candidate_keys = ['response_time', 'latency', 'response_time_ms', 'latency_ms', 'duration']
    for key in candidate_keys:
        if key in df.columns:
            return key
    return None

def main():
    file_path = parse_arguments()
    
    print(f"Reading logs from: {os.path.abspath(file_path)}")
    records, total_lines, corrupt_lines = load_jsonl_robustly(file_path)
    
    if not records:
        print("Error: No valid JSON objects parsed from the log file.", file=sys.stderr)
        sys.exit(1)
        
    # Load into Pandas DataFrame
    df = pd.DataFrame(records)
    
    # Identify latency column
    latency_col = find_latency_column(df)
    if not latency_col:
        print("Error: Could not find any standard latency column (e.g., 'response_time', 'latency', 'duration') in the log data.", file=sys.stderr)
        sys.exit(1)
        
    # Clean data: convert to numeric (coerce invalid entries to NaN) and filter out non-positive values
    raw_values_count = len(df)
    
    # Coerce to float, invalid entries become NaN
    df[latency_col] = pd.to_numeric(df[latency_col], errors='coerce')
    
    # Filter out missing, NaN, or non-positive latencies (latencies must be > 0)
    valid_df = df[df[latency_col] > 0].copy()
    
    valid_count = len(valid_df)
    ignored_values_count = raw_values_count - valid_count
    
    if valid_count == 0:
        print("Error: No valid, positive numeric latency values found in the log file.", file=sys.stderr)
        sys.exit(1)
        
    # Calculate performance metrics using Pandas
    latencies = valid_df[latency_col]
    mean_val = latencies.mean()
    median_val = latencies.median()
    p90_val = latencies.quantile(0.90)
    p99_val = latencies.quantile(0.99)
    
    # Print formatted summary to the console
    print("\n" + "="*50)
    print("               API PERFORMANCE SUMMARY               ")
    print("="*50)
    print(f"Log File:               {os.path.basename(file_path)}")
    print(f"Total Lines Processed:  {total_lines}")
    print(f"Valid JSON Objects:     {raw_values_count}")
    print(f"Corrupted JSON Lines:   {corrupt_lines}")
    print(f"Analyzed Request Count: {valid_count}")
    print(f"Ignored Latency Rows:   {ignored_values_count} (null/negative/missing)")
    print("-"*50)
    print(f"Metric                  Response Time (ms)")
    print("-"*50)
    print(f"Average:                {mean_val:18.2f}")
    print(f"Median (p50):           {median_val:18.2f}")
    print(f"90th Percentile (p90):  {p90_val:18.2f}")
    print(f"99th Percentile (p99):  {p99_val:18.2f}")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
