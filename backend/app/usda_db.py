import os

def list_usda_data_files():
    base_dirs = [
        'backend/app/data/FoodData_Central_csv',
        'backend/app/data/FoodData_Central_Supporting_Data_csv'
    ]

    files_dict = {}
    for dir_path in base_dirs:
        try:
            files = [
                f for f in os.listdir(dir_path)
                if os.path.isfile(os.path.join(dir_path, f))
            ]
            files_dict[dir_path] = files
        except Exception as e:
            print(f"Error: {e}")
            # files_dict[dir_path] = f"Error reading files: {e}"

    return files_dict

def main():
    print(list_usda_data_files())

if __name__ == "__main__":
    main()
