"""
Generate Synthetic Datasets for Multimodal ML Models
Generates datasets for image analysis and cough analysis to improve chatbot responses
"""

import argparse
import sys
from pathlib import Path

# Agregar raíz del proyecto al path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_models.synthetic_image_dataset_generator import SyntheticImageDatasetGenerator
from ml_models.synthetic_cough_dataset_generator import SyntheticCoughDatasetGenerator


def generate_image_dataset(output_file: str = 'synthetic_image_dataset.csv',
                          samples_per_type: dict = None):
    """Generate synthetic dataset for medical images"""
    print("🖼️  Generating synthetic image dataset...")
    
    generator = SyntheticImageDatasetGenerator()
    
    if samples_per_type is None:
        samples_per_type = {
            'chest_xray': 1000,
            'ct_scan': 800,
            'spirometry': 600,
            'oximetry': 500,
            'expectoration': 400,
            'skin_rash': 300,
            'cyanosis': 200,
            'other_medical_image': 200
        }
    
    df = generator.generate_dataset(samples_per_type, output_file)
    
    print(f"\n✅ Image dataset generated:")
    print(f"   Total cases: {len(df)}")
    print(f"   Image types: {df['image_type'].nunique()}")
    print(f"   Unique conditions: {df['condition'].nunique()}")
    print(f"\n   Cases per image type:")
    for img_type, count in df['image_type'].value_counts().items():
        print(f"      {img_type}: {count}")
    
    return df


def generate_cough_dataset(output_file: str = 'synthetic_cough_dataset.csv',
                           samples_per_type: dict = None):
    """Generate synthetic dataset for cough analysis"""
    print("\n🎤 Generating synthetic cough dataset...")
    
    generator = SyntheticCoughDatasetGenerator()
    
    if samples_per_type is None:
        samples_per_type = {
            'dry_cough': 500,
            'productive_cough': 500,
            'paroxysmal_cough': 300,
            'chronic_cough': 400,
            'whooping_cough': 200,
            'barking_cough': 300
        }
    
    df = generator.generate_dataset(samples_per_type, output_file)
    
    print(f"\n✅ Cough dataset generated:")
    print(f"   Total cases: {len(df)}")
    print(f"   Cough types: {df['cough_type'].nunique()}")
    print(f"   Severity levels: {df['severity'].nunique()}")
    print(f"\n   Cases per cough type:")
    for cough_type, count in df['cough_type'].value_counts().items():
        print(f"      {cough_type}: {count}")
    print(f"\n   Cases per severity:")
    for severity, count in df['severity'].value_counts().items():
        print(f"      {severity}: {count}")
    print(f"\n   Cases per urgency:")
    for urgency, count in df['urgency'].value_counts().items():
        print(f"      {urgency}: {count}")
    
    return df


def main():
    parser = argparse.ArgumentParser(
        description='Generate synthetic datasets for multimodal ML models'
    )
    parser.add_argument(
        '--images',
        action='store_true',
        help='Generate image dataset'
    )
    parser.add_argument(
        '--cough',
        action='store_true',
        help='Generate cough dataset'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Generate all datasets'
    )
    parser.add_argument(
        '--image-output',
        type=str,
        default='synthetic_image_dataset.csv',
        help='Output file for image dataset'
    )
    parser.add_argument(
        '--cough-output',
        type=str,
        default='synthetic_cough_dataset.csv',
        help='Output file for cough dataset'
    )
    
    args = parser.parse_args()
    
    if args.all or (not args.images and not args.cough):
        # Generate both by default
        generate_image_dataset(args.image_output)
        generate_cough_dataset(args.cough_output)
    else:
        if args.images:
            generate_image_dataset(args.image_output)
        
        if args.cough:
            generate_cough_dataset(args.cough_output)
    
    print("\n🎉 Dataset generation complete!")
    print("\nNext steps:")
    print("1. Review the generated datasets")
    print("2. Train models using these datasets")
    print("3. Integrate trained models with chatbot for improved responses")


if __name__ == "__main__":
    main()

