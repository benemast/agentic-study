#!/usr/bin/env python3
"""
Database Verification Script for LoadReviewsTool
Tests that the Amazon reviews dataset is properly loaded and accessible
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine, func, inspect
from sqlalchemy.orm import sessionmaker
from app.configs import settings
from app.models.reviews import ShoesReview, WirelessReview, get_review_model
from app.schemas.reviews import to_study_format
from app.orchestrator.tools.data_tools import LoadReviewsTool


def print_section(title):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def test_database_connection():
    """Test 1: Verify database connectivity"""
    print_section("TEST 1: Database Connection")
    
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("✅ Database connection successful")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def test_tables_exist():
    """Test 2: Verify review tables exist"""
    print_section("TEST 2: Review Tables Exist")
    
    try:
        engine = create_engine(settings.database_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = ['shoes_reviews', 'wireless_reviews']
        for table in required_tables:
            if table in tables:
                print(f"✅ Table '{table}' exists")
            else:
                print(f"❌ Table '{table}' NOT FOUND")
                return False
        
        return True
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False


def test_data_counts():
    """Test 3: Check data counts in each table"""
    print_section("TEST 3: Data Counts")
    
    try:
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Shoes reviews
        shoes_count = db.query(ShoesReview).count()
        shoes_verified = db.query(ShoesReview).filter(
            ShoesReview.verified_purchase == True
        ).count()
        shoes_not_malformed = db.query(ShoesReview).filter(
            ShoesReview.is_malformed == False
        ).count()
        
        print(f"📊 Shoes Reviews:")
        print(f"   Total: {shoes_count:,}")
        print(f"   Verified: {shoes_verified:,}")
        print(f"   Not malformed: {shoes_not_malformed:,}")
        
        # Wireless reviews
        wireless_count = db.query(WirelessReview).count()
        wireless_verified = db.query(WirelessReview).filter(
            WirelessReview.verified_purchase == True
        ).count()
        wireless_not_malformed = db.query(WirelessReview).filter(
            WirelessReview.is_malformed == False
        ).count()
        
        print(f"\n📊 Wireless Reviews:")
        print(f"   Total: {wireless_count:,}")
        print(f"   Verified: {wireless_verified:,}")
        print(f"   Not malformed: {wireless_not_malformed:,}")
        
        db.close()
        
        if shoes_count > 0 and wireless_count > 0:
            print(f"\n✅ Both tables have data")
            return True
        else:
            print(f"\n❌ One or both tables are empty")
            return False
            
    except Exception as e:
        print(f"❌ Error checking data: {e}")
        return False


def test_sample_queries():
    """Test 4: Run sample queries matching LoadReviewsTool logic"""
    print_section("TEST 4: Sample Queries")
    
    try:
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Test query 1: Get top 10 wireless reviews by helpfulness
        print("Query 1: Top 10 most helpful wireless reviews")
        wireless_top = db.query(WirelessReview).filter(
            WirelessReview.is_malformed == False
        ).order_by(
            WirelessReview.helpful_votes.desc(),
            WirelessReview.review_date.desc()
        ).limit(10).all()
        
        print(f"   Retrieved: {len(wireless_top)} reviews")
        if wireless_top:
            sample = wireless_top[0]
            print(f"   Sample: {sample.product_title[:50]}... ({sample.star_rating}⭐, {sample.helpful_votes} helpful)")
        
        # Test query 2: Get 5-star shoes reviews
        print("\nQuery 2: 5-star shoes reviews")
        shoes_5star = db.query(ShoesReview).filter(
            ShoesReview.star_rating == 5,
            ShoesReview.is_malformed == False
        ).limit(10).all()
        
        print(f"   Retrieved: {len(shoes_5star)} reviews")
        if shoes_5star:
            sample = shoes_5star[0]
            print(f"   Sample: {sample.product_title[:50]}...")
        
        # Test query 3: Verified purchases only
        print("\nQuery 3: Verified wireless purchases")
        verified_wireless = db.query(WirelessReview).filter(
            WirelessReview.verified_purchase == True,
            WirelessReview.is_malformed == False
        ).limit(5).all()
        
        print(f"   Retrieved: {len(verified_wireless)} reviews")
        
        db.close()
        
        print(f"\n✅ All sample queries executed successfully")
        return True
            
    except Exception as e:
        print(f"❌ Error running queries: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_to_study_format():
    """Test 5: Verify schema conversion to study format"""
    print_section("TEST 5: Study Format Conversion")
    
    try:
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Get sample review
        sample_review = db.query(WirelessReview).filter(
            WirelessReview.is_malformed == False
        ).first()
        
        if not sample_review:
            print("❌ No reviews found for testing")
            return False
        
        # Convert to study format
        study_review = to_study_format(sample_review)
        
        print("Original review fields:")
        print(f"   review_id: {sample_review.review_id}")
        print(f"   product_id: {sample_review.product_id}")
        print(f"   star_rating: {sample_review.star_rating}")
        
        print("\nStudy format fields:")
        print(f"   review_id: {study_review.review_id}")
        print(f"   product_id: {study_review.product_id}")
        print(f"   star_rating: {study_review.star_rating}")
        print(f"   review_body length: {len(study_review.review_body)} chars")
        
        # Verify sensitive fields are NOT exposed
        assert not hasattr(study_review, 'review_date'), "Sensitive field 'review_date' should be hidden"
        assert not hasattr(study_review, 'is_malformed'), "Internal field 'is_malformed' should be hidden"
        
        print(f"\n✅ Study format conversion successful (sensitive fields hidden)")
        
        db.close()
        return True
            
    except Exception as e:
        print(f"❌ Error testing study format: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_load_reviews_tool():
    """Test 6: Test LoadReviewsTool directly"""
    print_section("TEST 6: LoadReviewsTool Integration")
    
    try:
        tool = LoadReviewsTool()
        
        # Test 1: Load wireless reviews
        print("Test 6a: Load wireless reviews (default)")
        result = await tool.run({
            'category': 'wireless',
            'limit': 10
        })
        
        if result['success']:
            data = result['data']
            print(f"✅ Loaded {len(data['reviews'])} wireless reviews")
            print(f"   Total available: {data['total']:,}")
            print(f"   Execution time: {result['execution_time_ms']}ms")
            
            if data['reviews']:
                sample = data['reviews'][0]
                print(f"   Sample review: {sample['product_title'][:50]}...")
        else:
            print(f"❌ Tool failed: {result.get('error')}")
            return False
        
        # Test 2: Load with filters
        print("\nTest 6b: Load shoes reviews (5-star only)")
        result = await tool.run({
            'category': 'shoes',
            'min_rating': 5,
            'verified_only': True,
            'limit': 10
        })
        
        if result['success']:
            data = result['data']
            print(f"✅ Loaded {len(data['reviews'])} shoes reviews")
            print(f"   Filters applied: 5-star + verified")
        else:
            print(f"❌ Tool failed: {result.get('error')}")
            return False
        
        # Test 3: Invalid category
        print("\nTest 6c: Test error handling (invalid category)")
        result = await tool.run({
            'category': 'invalid'
        })
        
        if not result['success']:
            print(f"✅ Error handling works: {result['error']}")
        else:
            print(f"❌ Should have failed for invalid category")
            return False
        
        print(f"\n✅ LoadReviewsTool integration test passed")
        return True
            
    except Exception as e:
        print(f"❌ Error testing LoadReviewsTool: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all verification tests"""
    print("\n" + "="*60)
    print("  Amazon Reviews Database Verification")
    print("  Testing LoadReviewsTool SQL Access")
    print("="*60)
    
    tests = [
        ("Database Connection", test_database_connection()),
        ("Tables Exist", test_tables_exist()),
        ("Data Counts", test_data_counts()),
        ("Sample Queries", test_sample_queries()),
        ("Study Format", test_to_study_format()),
        ("LoadReviewsTool", await test_load_reviews_tool()),
    ]
    
    # Summary
    print_section("SUMMARY")
    
    passed = sum(1 for _, result in tests if result)
    total = len(tests)
    
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n{'='*60}")
    print(f"  Results: {passed}/{total} tests passed")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed! LoadReviewsTool can access SQL database.")
        return 0
    else:
        print("⚠️  Some tests failed. Check database setup and migrations.")
        return 1


if __name__ == "__main__":
    import asyncio
    exit_code = asyncio.run(main())
    sys.exit(exit_code)