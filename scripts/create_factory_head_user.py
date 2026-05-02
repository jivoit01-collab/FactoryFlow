import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DEBUG"] = "False"

import django

django.setup()

from django.contrib.auth.models import Group, Permission

from accounts.models import User
from company.models import Company, UserCompany, UserRole


def main():
    group, _ = Group.objects.get_or_create(name="Factory Head")
    permissions = Permission.objects.all()
    group.permissions.set(permissions)

    user, created = User.objects.get_or_create(
        email="head@jivo.in",
        defaults={
            "full_name": "Factory Head",
            "is_active": True,
            "is_staff": False,
            "is_superuser": False,
        },
    )
    user.full_name = user.full_name or "Factory Head"
    user.is_active = True
    user.is_staff = False
    user.is_superuser = False
    user.set_password("Factory@1234")
    user.save()
    user.groups.set([group])

    role, _ = UserRole.objects.get_or_create(
        name="Factory Head",
        defaults={"description": "Factory head approval role with full app permissions"},
    )

    companies = list(Company.objects.filter(is_active=True).order_by("id"))
    for index, company in enumerate(companies):
        user_company, _ = UserCompany.objects.get_or_create(
            user=user,
            company=company,
            defaults={
                "role": role,
                "is_active": True,
                "is_default": index == 0,
            },
        )
        user_company.role = role
        user_company.is_active = True
        user_company.is_default = index == 0
        user_company.save()

    if companies:
        UserCompany.objects.filter(user=user).exclude(company=companies[0]).update(is_default=False)

    print("Factory Head setup complete")
    print(f"user_created={created}")
    print(f"group_permissions={group.permissions.count()}")
    print(f"companies_assigned={len(companies)}")


if __name__ == "__main__":
    main()
