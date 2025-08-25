#!/usr/bin/env python3
"""
Power BI Dataset Setup Script for FinanseHub
This script creates a Power BI dataset for currency and interest rate data.
"""

import requests
import json
import os
from typing import Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PowerBISetup:
    def __init__(self):
        self.tenant_id = os.getenv('PBI_TENANT_ID')
        self.client_id = os.getenv('PBI_CLIENT_ID')
        self.client_secret = os.getenv('PBI_CLIENT_SECRET')
        self.group_id = os.getenv('PBI_GROUP_ID')
        self.access_token = None

    def get_access_token(self) -> str:
        """Get OAuth2 access token for Power BI API"""
        url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://analysis.windows.net/powerbi/api/.default",
            "grant_type": "client_credentials"
        }
        
        response = requests.post(url, data=data)
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            return self.access_token
        else:
            raise Exception(f"Failed to get access token: {response.text}")

    def get_headers(self) -> Dict[str, str]:
        """Get HTTP headers with authorization"""
        if not self.access_token:
            self.get_access_token()
        
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def list_datasets(self) -> list:
        """List all datasets in the workspace"""
        url = f"https://api.powerbi.com/v1.0/myorg/groups/{self.group_id}/datasets"
        
        response = requests.get(url, headers=self.get_headers())
        if response.status_code == 200:
            return response.json().get("value", [])
        else:
            print(f"Failed to list datasets: {response.text}")
            return []

    def create_dataset(self) -> Optional[str]:
        """Create a new dataset for FinanseHub"""
        dataset_def = {
            "name": "FinanseHub Currency & Interest Rates",
            "tables": [
                {
                    "name": "CurrencyRates",
                    "columns": [
                        {"name": "id", "dataType": "Int64"},
                        {"name": "baseCurrency", "dataType": "String"},
                        {"name": "quoteCurrency", "dataType": "String"},
                        {"name": "date", "dataType": "DateTime"},
                        {"name": "rate", "dataType": "Double"},
                        {"name": "createdAt", "dataType": "DateTime"},
                        {"name": "updatedAt", "dataType": "DateTime"}
                    ]
                },
                {
                    "name": "InterestRates", 
                    "columns": [
                        {"name": "id", "dataType": "Int64"},
                        {"name": "institution", "dataType": "String"},
                        {"name": "product", "dataType": "String"},
                        {"name": "date", "dataType": "DateTime"},
                        {"name": "rate", "dataType": "Double"},
                        {"name": "createdAt", "dataType": "DateTime"},
                        {"name": "updatedAt", "dataType": "DateTime"}
                    ]
                }
            ]
        }
        
        url = f"https://api.powerbi.com/v1.0/myorg/groups/{self.group_id}/datasets"
        
        response = requests.post(url, headers=self.get_headers(), json=dataset_def)
        if response.status_code == 201:
            dataset_id = response.json()["id"]
            print(f"✅ Created dataset: {dataset_id}")
            return dataset_id
        else:
            print(f"❌ Failed to create dataset: {response.text}")
            return None

    def find_or_create_dataset(self) -> Optional[str]:
        """Find existing FinanseHub dataset or create new one"""
        datasets = self.list_datasets()
        
        # Look for existing FinanseHub dataset
        for dataset in datasets:
            if "FinanseHub" in dataset["name"]:
                print(f"✅ Found existing dataset: {dataset['name']} (ID: {dataset['id']})")
                return dataset["id"]
        
        # Create new dataset if not found
        print("📊 Creating new FinanseHub dataset...")
        return self.create_dataset()

    def test_connection(self) -> bool:
        """Test Power BI API connection"""
        try:
            self.get_access_token()
            datasets = self.list_datasets()
            print(f"✅ Successfully connected to Power BI. Found {len(datasets)} datasets.")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to Power BI: {e}")
            return False

def main():
    print("🔄 Setting up Power BI integration for FinanseHub...")
    
    pbi = PowerBISetup()
    
    # Test connection
    if not pbi.test_connection():
        return
    
    # Find or create dataset
    dataset_id = pbi.find_or_create_dataset()
    
    if dataset_id:
        print(f"\n🎉 Power BI setup completed!")
        print(f"Dataset ID: {dataset_id}")
        print(f"Workspace ID: {pbi.group_id}")
        print(f"\n📝 Add this to your Azure Key Vault:")
        print(f"az keyvault secret set --vault-name kv-finansehub-054 --name 'PBI-DATASET-ID' --value '{dataset_id}'")
        print(f"\n📊 You can now access your dataset at:")
        print(f"https://app.powerbi.com/groups/{pbi.group_id}/datasets/{dataset_id}")
    else:
        print("❌ Failed to set up Power BI dataset")

if __name__ == "__main__":
    main()
