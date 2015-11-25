#!/usr/bin/env python
"""Upload realtime SeaFlow data to SQLShare."""

import sqlshare
import sys


def exit(message, code=1):
    """Exit with error message."""
    sys.stderr.write(message + "\n")
    sys.exit(code)


def main():
    """Main function."""
    # Find the STAT.CSV file
    stats_file = "stat-gga2dd.csv"
    stats_table = "stat.csv"
    # Find the SFL.CSV file
    sfl_file = "sfl-gga2dd.csv"
    sfl_table = "sfl.csv"

    # Find the cstar3min.csv file
    cstar3_file = "cstar3min.csv"
    cstar3_table = "cstar3min.csv"

    # Find the full cstar.csv file
    cstar_file = "cstar.csv"
    cstar_table = "cstar.csv"

    sql = sqlshare.SQLShare()

    try:
        print("updating STATS...")
        sql.uploadone(stats_file, stats_table)
    except Exception:
        sys.stderr.write("Could not upload %s\n" % stats_file)
        pass

    try:
        print("updating SFL...")
        sql.uploadone(sfl_file, sfl_table)
    except Exception:
        sys.stderr.write("Could not upload %s\n" % sfl_file)
        pass

    try:
        print("updating CSTAR 3 min...")
        sql.uploadone(cstar3_file, cstar3_table)
    except Exception:
        sys.stderr.write("Could not upload %s\n" % cstar3_file)
        pass

    try:
        print("updating CSTAR ...")
        sql.uploadone(cstar_file, cstar_table)
    except Exception:
        sys.stderr.write("Could not upload %s\n" % cstar_file)
        pass

if __name__ == "__main__":
    main()