import numpy as np

# Вибірка даних
X = np.array([1,4,6,9,5])  

# Емпіричне математичне сподівання
mean_X = np.mean(X)

# Емпірична дисперсія
variance_X = np.var(X)

# Точкова оцінка параметра alpha
estimated_alpha = mean_X

# Точкова оцінка параметра omega
estimated_omega = np.sqrt(variance_X)

# Виведення результатів
print(f"Точкова оцінка параметра alpha: {estimated_alpha}")
print(f"Точкова оцінка параметра omega: {estimated_omega}")
